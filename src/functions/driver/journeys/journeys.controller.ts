import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ResponseBuilder } from '../../../responses/response-builder';
import { ApiEvent, ApiHandler, ApiResponse } from '../../../responses/api.types';
import { GetResult, GetResultPromise, ScanResult } from '../../../responses/dynamodb.types';
import { JOURNEY_TABLE } from '../../../constants/tables';
import { JourneyDetailsData, MyJourneysData } from './journeys.interfaces';
import { JOURNEY_INDEX } from '../../../constants/indexes';
import ScanInput = DocumentClient.ScanInput;
import GetItemInput = DocumentClient.GetItemInput;
import UpdateItemInput = DocumentClient.UpdateItemInput;
import UpdateItemOutput = DocumentClient.UpdateItemOutput;

export class JourneyController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public myJourneys: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: MyJourneysData = JSON.parse(event.body);

		try {
			const response: ScanResult = await this._getMyJourneys(data.userId);

			return ResponseBuilder.ok({ success: true, journeys: response.Items });
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

		console.log(data);

		try {
			const response: UpdateItemOutput = await this._startJourney(data.journeyId);

			return ResponseBuilder.ok({ success: true, response });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _getMyJourneys = (userId: string): GetResultPromise => {
		const params: ScanInput = {
			TableName: JOURNEY_TABLE,
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
			UpdateExpression: 'SET journeyStatus = :status',
			ExpressionAttributeValues: {
				':status': 'STARTED'
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}
