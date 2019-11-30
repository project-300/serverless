import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ResponseBuilder } from '../../../responses/response-builder';
import { ApiEvent, ApiHandler, ApiResponse } from '../../../responses/api.types';
import { GetResult, GetResultPromise, QueryResult, ScanResult, ScanResultPromise } from '../../../responses/dynamodb.types';
import { JOURNEY_TABLE, USER_TABLE } from '../../../constants/tables';
import { DriverMovementData, JourneyDetailsData, MyJourneysData } from './journeys.interfaces';
import { JOURNEY_INDEX, USERS_INDEX } from '../../../constants/indexes';
import ScanInput = DocumentClient.ScanInput;
import GetItemInput = DocumentClient.GetItemInput;
import UpdateItemInput = DocumentClient.UpdateItemInput;
import UpdateItemOutput = DocumentClient.UpdateItemOutput;
import { Coords, Journey, Passenger } from '@project-300/common-types';
import _ from 'lodash';

export class JourneyController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public driverJourneys: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: MyJourneysData = JSON.parse(event.body);

		try {
			const response: ScanResult = await this._getDriverJourneys(data.userId);
			const allJourneys: Journey[] = response.Items as Journey[];

			const journeys: { current: Journey[]; previous: Journey[] } = _.reduce(allJourneys,
				(journeyMemo: { previous: Journey[]; current: Journey[] }, journey: Journey) => {
					if (journey.journeyStatus === 'FINISHED') journeyMemo.previous.push(journey);
					else journeyMemo.current.push(journey);
					return journeyMemo;
			}, { previous: [], current: [] });

			return ResponseBuilder.ok({ success: true, journeys, journeyCount: allJourneys.length });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	public passengerJourneys: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: MyJourneysData = JSON.parse(event.body);

		try {
			const journeyIds: string[] = await this._getPassengerJourneyIds(data.userId);
			console.log(journeyIds);
			if (!journeyIds || !journeyIds.length) return ResponseBuilder.ok({
				success: true,
					journeys: {
					current: [],
					previous: []
				},
				journeyCount: 0
			});

			console.log('has ids');
			const response: QueryResult = await this._getPassengerJourneys(journeyIds);
			const allJourneys: Journey[] = response.Items as Journey[];

			const journeys: { current: Journey[]; previous: Journey[] } = _.reduce(allJourneys,
				(journeyMemo: { previous: Journey[]; current: Journey[] }, journey: Journey) => {
					if (journey.journeyStatus === 'FINISHED') journeyMemo.previous.push(journey);
					else journeyMemo.current.push(journey);
					return journeyMemo;
			}, { previous: [], current: [] });

			console.log('done');

			return ResponseBuilder.ok({ success: true, journeys, journeyCount: allJourneys.length });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err);
		}
	}

	public getJourneyDetails: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: JourneyDetailsData = JSON.parse(event.body);

		try {
			const response: GetResult = await this._getJourneyDetails(data.journeyId);

			return ResponseBuilder.ok({ success: true, journey: response.Item });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	public startJourney: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: JourneyDetailsData = JSON.parse(event.body);

		try {
			const response: UpdateItemOutput = await this._startJourney(data.journeyId);

			return ResponseBuilder.ok({ success: true, journey: response.Attributes });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	public endJourney: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: JourneyDetailsData = JSON.parse(event.body);

		try {
			const response: UpdateItemOutput = await this._endJourney(data.journeyId);

			return ResponseBuilder.ok({ success: true, journey: response.Attributes });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	public driverMovement: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: DriverMovementData = JSON.parse(event.body);

		try {
			const response: UpdateItemOutput = await this._addDriverMovement(data.journeyId, data.coords);

			return ResponseBuilder.ok({ success: true, journey: response.Attributes });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _getDriverJourneys = (userId: string): GetResultPromise => {
		const params: ScanInput = {
			TableName: JOURNEY_TABLE,
			ProjectionExpression: 'journeyId, journeyStatus, passengers, times, destination, origin, totalNoOfSeats, seatsLeft, pricePerSeat',
			FilterExpression: '#d.#u = :userId',
			ExpressionAttributeNames: {
				'#d': 'driver',
				'#u': 'userId'
			},
			ExpressionAttributeValues: {
				':userId': userId
			}
		};

		return this.dynamo.scan(params).promise();
	}

	private _getPassengerJourneyIds = async (userId: string): Promise<string[]> => {
		const params: GetItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			}
		};

		const res: GetResult = await this.dynamo.get(params).promise();
		if (!res.Item) return;
		const user: Passenger = res.Item as Passenger;
		return user.journeysAsPassenger;
	}

	private _getPassengerJourneys = (journeyIds: string[]): ScanResultPromise => {
		const keysObj: object = { };
		let index: number = 0;
		console.log(journeyIds);
		journeyIds.forEach((id: string) => {
			index += 1;
			const titleKey: string = ':idVal' + index;
			keysObj[titleKey] = id;
		});

		const params: ScanInput = {
			TableName: JOURNEY_TABLE,
			FilterExpression: `#id IN (${Object.keys(keysObj).toString()})`,
			ExpressionAttributeNames: {
				'#id': 'journeyId'
			},
			ExpressionAttributeValues: keysObj
		};

		return this.dynamo.scan(params).promise();
	}

	private _getJourneyDetails = (journeyId: string): GetResultPromise => {
		const params: GetItemInput = {
			TableName: JOURNEY_TABLE,
			Key: {
				[JOURNEY_INDEX]: journeyId
			}
		};

		return this.dynamo.get(params).promise();
	}

	private _startJourney = (journeyId: string): Promise<UpdateItemOutput> => {
		const params: UpdateItemInput = {
			TableName: JOURNEY_TABLE,
			Key: {
				[JOURNEY_INDEX]: journeyId
			},
			UpdateExpression: 'SET journeyStatus = :status, times.started = :now, times.updatedAt = :now',
			ExpressionAttributeValues: {
				':status': 'STARTED',
				':now': new Date().toISOString()
			},
			ReturnValues: 'ALL_NEW'
		};

		return this.dynamo.update(params).promise();
	}

	private _endJourney = (journeyId: string): Promise<UpdateItemOutput> => {
		const params: UpdateItemInput = {
			TableName: JOURNEY_TABLE,
			Key: {
				[JOURNEY_INDEX]: journeyId
			},
			UpdateExpression: 'SET journeyStatus = :status, times.finished = :now, times.updatedAt = :now',
			ExpressionAttributeValues: {
				':status': 'FINISHED',
				':now': new Date().toISOString()
			},
			ReturnValues: 'ALL_NEW'
		};

		return this.dynamo.update(params).promise();
	}

	private _addDriverMovement = (journeyId: string, coords: Coords): Promise<UpdateItemOutput> => {
		const params: UpdateItemInput = {
			TableName: JOURNEY_TABLE,
			Key: {
				[JOURNEY_INDEX]: journeyId
			},
			UpdateExpression: 'SET routeTravelled = list_append(routeTravelled, :c), times.updatedAt = :now',
			ExpressionAttributeValues: {
				':c': [ coords ],
				':now': new Date().toISOString()
			},
			ReturnValues: 'ALL_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}
