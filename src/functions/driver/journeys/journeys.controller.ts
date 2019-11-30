import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ResponseBuilder } from '../../../responses/response-builder';
import { ApiEvent, ApiHandler, ApiResponse } from '../../../responses/api.types';
import { GetResult, GetResultPromise, ScanResult } from '../../../responses/dynamodb.types';
import { JOURNEY_TABLE } from '../../../constants/tables';
import { DriverMovementData, JourneyDetailsData, MyJourneysData } from './journeys.interfaces';
import { JOURNEY_INDEX } from '../../../constants/indexes';
import ScanInput = DocumentClient.ScanInput;
import GetItemInput = DocumentClient.GetItemInput;
import UpdateItemInput = DocumentClient.UpdateItemInput;
import UpdateItemOutput = DocumentClient.UpdateItemOutput;
import { Coords, Journey } from '@project-300/common-types';
import _ from 'lodash';

export class JourneyController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public myJourneys: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: MyJourneysData = JSON.parse(event.body);

		try {
			const response: ScanResult = await this._getMyJourneys(data.userId);
			const allJourneys: Journey[] = response.Items as Journey[];

			const journeys: { current: Journey[]; previous: Journey[] } = _.reduce(allJourneys,
				(journeyMemo: { previous: Journey[]; current: Journey[] }, journey: Journey) => {
					if (journey.journeyStatus === 'FINISHED') journeyMemo.previous.push(journey);
					else journeyMemo.current.push(journey);
					return journeyMemo;
			}, { previous: [], current: [] });

			return ResponseBuilder.ok({ success: true, journeys });
		} catch (err) {
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
			console.log(err);
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _getMyJourneys = (userId: string): GetResultPromise => {
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
