import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { DRIVER_APPLICATION_INDEX } from '../../constants/indexes';
import { DRIVER_APPLICATION_TABLE } from '../../constants/tables';
import PubManager from '../../pubsub/publication';
import { GetResult, GetResultPromise, PutResult, QueryResult, QueryResultPromise } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { DriverApplicationResult, DriverApplicationCheckResult } from './driver-application.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.types';
import PutItemInput = DocumentClient.PutItemInput;
import QueryInput = DocumentClient.QueryInput;
import GetItemInput = DocumentClient.GetItemInput;

export class DriverApplicationController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public check: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		try {
			const userId: string = JSON.parse(event.body).userId;
			const response: QueryResult = await this._checkForPreviousApplication(userId);

			const result: DriverApplicationCheckResult = {
				success: true,
				alreadyApplied: !!response.Count
			};

			ResponseBuilder.ok<DriverApplicationResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback, err.message);
		}
	}

	public apply: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: DriverApplicationResult = {
			success: true
		};

		try {
			const userId: string = JSON.parse(event.body).userId;

			const response: QueryResult = await this._checkForPreviousApplication(userId);
			if (response.Count) throw Error('You have already made an application');

			await this._createApplication(userId);
			const newApplication: GetResult = await this._retrieveApplication(userId);
			await PubManager.publishInsert('admin/driver-applications', DRIVER_APPLICATION_INDEX, newApplication.Item);

			result.newApplication = newApplication;

			ResponseBuilder.ok<DriverApplicationResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback, err.message);
		}
	}

	private _checkForPreviousApplication = (userId: string): QueryResultPromise => {
		const params: QueryInput = {
			TableName: DRIVER_APPLICATION_TABLE,
			KeyConditionExpression: 'userId = :userId',
			ExpressionAttributeValues: {
				':userId': userId
			}
		};

		return this.dynamo.query(params).promise();
	}

	private _createApplication = (userId: string): PutResult => {
		const now: string = new Date().toISOString();

		const params: PutItemInput = {
			TableName: DRIVER_APPLICATION_TABLE,
			Item: {
				[DRIVER_APPLICATION_INDEX]: userId,
				approved: false,
				times: {
					applied: now
				}
			}
		};

		return this.dynamo.put(params).promise();
	}

	private _retrieveApplication = (userId: string): GetResultPromise => {
		const params: GetItemInput = {
			TableName: DRIVER_APPLICATION_TABLE,
			Key: {
				[DRIVER_APPLICATION_INDEX]: userId
			}
		};

		return this.dynamo.get(params).promise();
	}

}
