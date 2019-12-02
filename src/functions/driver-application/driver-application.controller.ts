import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { DRIVER_APPLICATION_INDEX, USERS_INDEX } from '../../constants/indexes';
import { DRIVER_APPLICATION_TABLE, USER_TABLE } from '../../constants/tables';
import PubManager from '../../pubsub/publication';
import { GetResult, GetResultPromise, PutResult, QueryResult, QueryResultPromise, UpdateResult } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { DriverApplicationResult, DriverApplicationCheckResult } from './driver-application.interfaces';
import { ApiEvent, ApiHandler, ApiResponse } from '../../responses/api.types';
import PutItemInput = DocumentClient.PutItemInput;
import QueryInput = DocumentClient.QueryInput;
import GetItemInput = DocumentClient.GetItemInput;
import UpdateItemInput = DocumentClient.UpdateItemInput;

export class DriverApplicationController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient(
		process.env.IS_OFFLINE ? { region: 'localhost', endpoint: 'http://localhost:8000' } : { }
	);

	public check: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		try {
			const userId: string = JSON.parse(event.body).userId;
			const response: QueryResult = await this._checkForPreviousApplication(userId);

			const result: DriverApplicationCheckResult = {
				success: true,
				alreadyApplied: !!response.Count
			};

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public apply: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const result: DriverApplicationResult = {
			success: true
		};

		try {
			const userId: string = JSON.parse(event.body).userId;

			const response: QueryResult = await this._checkForPreviousApplication(userId);
			if (response.Count) throw Error('You have already made an application');

			await this._createApplication(userId);
			await this._updateUserType(userId); // ************ Temporarily auto approve application
			const newApplication: GetResult = await this._retrieveApplication(userId);
			await PubManager.publishInsert('admin/driver-applications', DRIVER_APPLICATION_INDEX, newApplication.Item);

			result.newApplication = newApplication;

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
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

	private _updateUserType = (userId: string): UpdateResult => {
		const params: UpdateItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			},
			UpdateExpression: 'SET userType = :type',
			ExpressionAttributeValues: {
				':type': 'Driver'
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}
