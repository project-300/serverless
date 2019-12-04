import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ResponseBuilder } from '../../responses/response-builder';
import {
	GetResult,
	GetResultPromise,
	ScanResult,
	UpdateResult
} from '../../responses/dynamodb.types';
import { ApiEvent, ApiHandler, ApiResponse } from '../../responses/api.types';
import ScanInput = DocumentClient.ScanInput;
import UpdateItemInput = DocumentClient.UpdateItemInput;
import GetItemInput = DocumentClient.GetItemInput;
import { JOURNEY_TABLE, USER_TABLE } from '../../constants/tables';
import { JOURNEY_INDEX, USERS_INDEX } from '../../constants/indexes';
import { JourneyErrorChecks } from './journey.interfaces';
import { Journey, PassengerBrief, UserBrief } from '@project-300/common-types';

export class JourneyController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public userJoinedJourney: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: { userId: string; journeyId: string }  = JSON.parse(event.body);
		const { userId, journeyId }: { userId: string; journeyId: string } = data;

		try {
			const journeyRes: GetResult = await this._getJourney(journeyId);
			const j: Journey = journeyRes.Item as Journey;
			const isValid: JourneyErrorChecks = await this._journeyErrorChecks(j, userId);

			if (isValid.result) {
				const userResponse: GetResult = await this._getUserBrief(userId);
				const user: UserBrief = userResponse.Item as UserBrief;
				await this._updateJourney(journeyId, user);
				await this._updateJourneyAsPassenger(journeyId, userId);

				return ResponseBuilder.ok({ success: true });
			}

			return ResponseBuilder.internalServerError(Error('Unable to update journey'), isValid.errorDescription);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to update journey');
		}
	}

	private _getUserBrief = async (userId: string): GetResultPromise => {
		const params: GetItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			},
			ProjectionExpression: 'userId, username, firstName, lastName, avatar, userType'
		};

		return this.dynamo.get(params).promise();
	}

	private _journeyErrorChecks = (journey: Journey, userId: string): JourneyErrorChecks => {
		if (journey.seatsLeft <= 0) return { result: false, errorDescription: 'No Seats Available' };
		if (journey.driver.userId === userId) return { result: false, errorDescription: 'Driver cannot join own journey' };
		if (journey.passengers.find((p: PassengerBrief) => p.userId === userId))
			return { result: false, errorDescription: 'User is already a passenger' };

		return { result: true };
	}

	private _getJourney = (journeyId: string): GetResultPromise => {
		const params: GetItemInput = {
			TableName: JOURNEY_TABLE,
			Key: {
				[JOURNEY_INDEX]: journeyId
			}
		};

		return this.dynamo.get(params).promise();
	}

	private _updateJourneyAsPassenger = (journeyId: string, userId: string): UpdateResult => {
		const params: UpdateItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			},
			UpdateExpression:
				'set journeysAsPassenger = list_append(journeysAsPassenger, :journeyId)',
			ExpressionAttributeValues: {
				':journeyId': [journeyId]
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

	private _updateJourney = (journeyId: string, user: UserBrief): UpdateResult => {
		const params: UpdateItemInput = {
			TableName: JOURNEY_TABLE,
			Key: {
				[JOURNEY_INDEX]: journeyId
			},
			UpdateExpression:
				'set seatsLeft = seatsLeft - :seat, passengers = list_append(passengers, :p)',
			ExpressionAttributeValues: {
				':seat': 1,
				':p': [ user ]
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

	public allJourneys: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const userId: string = event.pathParameters.userId;

		try {
			const response: ScanResult = await this._getAllJourneys(userId);
			const journeys: Journey[] = response.Items as Journey[];

			journeys.sort((a: Journey, b: Journey) => {
				if (a.times.leavingAt > b.times.leavingAt) return 1;
				if (a.times.leavingAt < b.times.leavingAt) return -1;
				return 0;
			});

			return ResponseBuilder.ok({ success: true, journeys });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _getAllJourneys = (userId: string): GetResultPromise => {
		const params: ScanInput = {
			TableName: JOURNEY_TABLE,
			FilterExpression:
				'journeyStatus = :status and seatsLeft > :value and NOT contains(passengers, :userId)',
			ExpressionAttributeValues: {
				':status': 'NOT_STARTED',
				':value': 0,
				':userId': userId
			}
		};

		return this.dynamo.scan(params).promise();
	}

}
