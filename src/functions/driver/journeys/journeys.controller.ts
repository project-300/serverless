import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ResponseBuilder } from '../../../responses/response-builder';
import { ApiEvent, ApiHandler, ApiResponse } from '../../../responses/api.types';
import {
	GetResult,
	GetResultPromise,
	PutResult,
	PutResultPromise,
	QueryResult,
	ScanResult,
	ScanResultPromise
} from '../../../responses/dynamodb.types';
import { JOURNEY_TABLE, USER_TABLE } from '../../../constants/tables';
import {
	CancelPassengerAcceptedJourneyData,
	CreateJourneyData,
	DriverMovementData,
	DriverSubscriptionData,
	JourneyDetailsData,
	MyJourneysData
} from './journeys.interfaces';
import { JOURNEY_INDEX, USERS_INDEX } from '../../../constants/indexes';
import ScanInput = DocumentClient.ScanInput;
import GetItemInput = DocumentClient.GetItemInput;
import UpdateItemInput = DocumentClient.UpdateItemInput;
import UpdateItemOutput = DocumentClient.UpdateItemOutput;
import {
	CollectionItem,
	Coords,
	CreateJourney,
	DriverBrief,
	Journey,
	Passenger,
	PassengerBrief,
	UserBrief
} from '@project-300/common-types';
import _ from 'lodash';
import SubManager from '../../../pubsub/subscription';
import PubManager from '../../../pubsub/publication';
import uuidv4 from 'uuid/v4';
import { UserController } from '../../user/user.controller';
import PutItemInput = DocumentClient.PutItemInput;

export class JourneyController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();
	private userController: UserController = new UserController();

	public createJourney: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: CreateJourneyData = JSON.parse(event.body);

		try {
			const driverResult: GetResult = await this.userController.getUserBrief(data.userId);
			const user: UserBrief = driverResult.Item as UserBrief;
			const driver: DriverBrief =	{ ...user, lastLocation: { latitude: 0, longitude: 0} };
			const journey: Journey = this._formJourneyObject(data.journey, driver);
			const response: PutResult = await this._insertJourney(journey);

			return ResponseBuilder.ok({ success: true, response });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err);
		}
	}

	public driverJourneys: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: MyJourneysData = JSON.parse(event.body);

		try {
			const response: ScanResult = await this._getDriverJourneys(data.userId);
			const allJourneys: Journey[] = response.Items as Journey[];

			const journeys: { current: Journey[]; previous: Journey[] } =
				_.reduce(allJourneys.sort(this._sortJourneysByCreatedAt),
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

	private _sortJourneysByCreatedAt = (j1: Journey, j2: Journey): number => {
		if (j1.times.createdAt > j2.times.createdAt) return -1;
		if (j1.times.createdAt < j2.times.createdAt) return 1;
		return 0;
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
			await PubManager.publishInsert(`journey/driver-location/#${data.journeyId}`, JOURNEY_INDEX,
				{ journeyId: data.journeyId, location: data.coords } as CollectionItem);

			return ResponseBuilder.ok({ success: true, journey: response.Attributes });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err);
		}
	}

	public subscribeDriverLocation: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: DriverSubscriptionData = JSON.parse(event.body);

		try {
			if (data.subscribe) {
				await SubManager.subscribe(
					event,
					data.subscription,
					JOURNEY_INDEX,
					undefined,
					false
				);
			} else {
				await SubManager.unsubscribe(data.subscription, event.requestContext.connectionId);
			}

			return ResponseBuilder.ok({ success: true });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _formJourneyObject = (j: CreateJourney, driver: DriverBrief): Journey => {
		let { leavingAt }: { leavingAt: Date | string } = j.times;
		if (leavingAt instanceof Date) leavingAt = leavingAt.toISOString();

		return {
			...j,
			journeyId: uuidv4(),
			journeyStatus: 'NOT_STARTED',
			passengers: [],
			routeTravelled: [],
			seatsLeft: j.totalNoOfSeats,
			driver,
			times: {
				leavingAt,
				createdAt: new Date().toISOString()
			}
		};
	}

	private _insertJourney = (journey: Journey): PutResultPromise => {
		const params: PutItemInput = {
			TableName: JOURNEY_TABLE,
			Item: journey
		};

		return this.dynamo.put(params).promise();
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
			UpdateExpression: 'SET journeyStatus = :status, times.endedAt = :now, times.updatedAt = :now',
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
			UpdateExpression: 'SET routeTravelled = list_append(routeTravelled, :c), driver.lastLocation = :l, times.updatedAt = :now',
			ExpressionAttributeValues: {
				':c': [ coords ],
				':l': coords,
				':now': new Date().toISOString()
			},
			ReturnValues: 'ALL_NEW'
		};

		return this.dynamo.update(params).promise();
	}

			/* TO BE MOVED TO PASSENGER DIRECTORY */

	public passengerJourneys: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: MyJourneysData = JSON.parse(event.body);

		if (!data.userId) return ResponseBuilder.internalServerError({ message: 'User ID is missing' });

		try {
			const journeys: { previous: Journey[]; current: Journey[] } = await this._getPassengerJourneys(data.userId);

			return ResponseBuilder.ok({ success: true, journeys, journeyCount: (journeys.previous.length + journeys.current.length) });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _sortJourneys = (allJourneys: Journey[]): { previous: Journey[]; current: Journey[] } => {
		const journeys: { current: Journey[]; previous: Journey[] } = _.reduce(allJourneys.sort(this._sortJourneysByCreatedAt),
			(journeyMemo: { previous: Journey[]; current: Journey[] }, journey: Journey) => {
			if (journey.journeyStatus === 'FINISHED') journeyMemo.previous.push(journey);
			else journeyMemo.current.push(journey);
			return journeyMemo;
		}, { previous: [], current: [] });

		return journeys;
	}

	public cancelPassengerAcceptedJourney: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: CancelPassengerAcceptedJourneyData = JSON.parse(event.body);
		const { userId, journeyId }: CancelPassengerAcceptedJourneyData = data;

		if (!journeyId) return ResponseBuilder.internalServerError({ message: 'Journey ID is missing' });
		if (!userId) return ResponseBuilder.internalServerError({ message: 'User ID is missing' });

		try {
			await this._cancelPassengerAcceptedJourney(journeyId, userId);
			const journeys: { previous: Journey[]; current: Journey[] } = await this._getPassengerJourneys(userId);

			return ResponseBuilder.ok({ success: true, journeys });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'An error occurred while attempting to cancel journey');
		}
	}

	private _getPassengerJourneys = async (userId: string): Promise<{ previous: Journey[]; current: Journey[] }> => {
		const journeyIds: string[] = await this._getPassengerJourneyIds(userId);

		if (!journeyIds || !journeyIds.length) return { previous: [], current: [] };

		const response: QueryResult = await this._queryPassengerJourneys(journeyIds);
		const allJourneys: Journey[] = response.Items as Journey[];
		return this._sortJourneys(allJourneys);
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

	private _queryPassengerJourneys = (journeyIds: string[]): ScanResultPromise => {
		const keysObj: object = { };
		let index: number = 0;

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

	private _cancelPassengerAcceptedJourney = async (journeyId: string, userId: string): Promise<void> => {
		const journeyIndex: number = await this._getUserJourneyIndex(journeyId, userId);
		const passengerIndex: number = await this._getJourneyPassengerIndex(journeyId, userId);

		if (journeyIndex === -1) throw Error('User is not a passenger of this journey (1)');
		if (passengerIndex === -1) throw Error('User is not a passenger of this journey (2)');

		await this._removeAcceptedJourneyFromUser(journeyIndex, userId);
		await this._removeAcceptedJourneyFromJourney(passengerIndex, journeyId);
	}

	private _removeAcceptedJourneyFromUser = async (journeyIndex: number, userId: string): Promise<UpdateItemOutput> => {
		const params: UpdateItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			},
			UpdateExpression: `REMOVE journeysAsPassenger[${journeyIndex}]`,
			ReturnValues: 'NONE'
		};

		return this.dynamo.update(params).promise();
	}

	private _removeAcceptedJourneyFromJourney = async (passengerIndex: number, journeyId: string): Promise<UpdateItemOutput> => {
		const params: UpdateItemInput = {
			TableName: JOURNEY_TABLE,
			Key: {
				[JOURNEY_INDEX]: journeyId
			},
			UpdateExpression: `SET seatsLeft = seatsLeft + :inc REMOVE passengers[${passengerIndex}]`,
			ExpressionAttributeValues: {
				':inc': 1
			},
			ReturnValues: 'NONE'
		};

		return this.dynamo.update(params).promise();
	}

	private _getUserJourneyIndex = async (journeyId: string, userId: string): Promise<number> => {
		const res: GetResult = await this._getUserJourneyIds(userId);
		if (!res.Item || !res.Item.journeysAsPassenger) return -1;

		const journeyIds: string[] = res.Item.journeysAsPassenger;

		return journeyIds.indexOf(journeyId);
	}

	private _getUserJourneyIds = (userId: string): GetResultPromise => {
		const params: GetItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			},
			ProjectionExpression: 'journeysAsPassenger'
		};

		return this.dynamo.get(params).promise();
	}

	private _getJourneyPassengerIndex = async (journeyId: string, userId: string): Promise<number> => {
		const res: GetResult = await this._getJourneyPassengers(journeyId);
		if (!res.Item || !res.Item.passengers) return -1;

		const passengers: PassengerBrief[] = res.Item.passengers;

		return passengers.findIndex((p: PassengerBrief) => p.userId === userId);
	}

	private _getJourneyPassengers = (journeyId: string): GetResultPromise => {
		const params: GetItemInput = {
			TableName: JOURNEY_TABLE,
			Key: {
				[JOURNEY_INDEX]: journeyId
			},
			ProjectionExpression: 'passengers'
		};

		return this.dynamo.get(params).promise();
	}
}
