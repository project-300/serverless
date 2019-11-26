import { SubscriptionRequest } from '@project-300/common-types';
import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import PubManager from '../../../pubsub/publication';
import SubManager from '../../../pubsub/subscription';
import { DeleteResult, GetResult, GetResultPromise, ScanResult, ScanResultPromise, UpdateResult } from '../../../responses/dynamodb.types';
import { DRIVER_APPLICATION_INDEX, USERS_INDEX } from '../../../constants/indexes';
import { DRIVER_APPLICATION_TABLE, USER_TABLE } from '../../../constants/tables';
import { ResponseBuilder } from '../../../responses/response-builder';
import {
	DriverApplicationApprovalResult,
	DriverApplicationDeleteResult,
	DriverApplicationsSubscriptionResult
} from './driver-applications.interfaces';
import { ApiEvent, ApiHandler, ApiResponse } from '../../../responses/api.types';
import UpdateItemInput = DocumentClient.UpdateItemInput;
import ScanInput = DocumentClient.ScanInput;
import DeleteItemInput = DocumentClient.DeleteItemInput;
import GetItemInput = DocumentClient.GetItemInput;

export class DriverApplicationController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient(
		process.env.IS_OFFLINE ? { region: 'localhost', endpoint: 'http://localhost:8000' } : { }
	);

	public getApplications: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const result: DriverApplicationsSubscriptionResult = {
			success: true
		};

		const body: SubscriptionRequest = JSON.parse(event.body);

		try {
			if (body.subscribe) {
				const data: ScanResult = await this._applications();
				await SubManager.subscribe(
					event,
					body.subscription,
					DRIVER_APPLICATION_INDEX,
					data.Items,
					true
				);
			} else {
				await SubManager.unsubscribe(body.subscription, event.requestContext.connectionId);
			}

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _applications = (): ScanResultPromise => {
		const params: ScanInput = {
			TableName: DRIVER_APPLICATION_TABLE
		};

		return this.dynamo.scan(params).promise();
	}

	public approveApplication: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const result: DriverApplicationApprovalResult = {
			success: true
		};

		const userId: string = JSON.parse(event.body).userId;

		try {
			await this._updateUserType(userId);
			await this._updateApplication(userId);
			const updatedApplication: GetResult = await this._retrieveApplication(userId);
			await PubManager.publishUpdate('admin/driver-applications', DRIVER_APPLICATION_INDEX, updatedApplication.Item);

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
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

	private _updateApplication = (userId: string): UpdateResult => {

		const params: UpdateItemInput = {
			TableName: DRIVER_APPLICATION_TABLE,
			Key: {
				[DRIVER_APPLICATION_INDEX]: userId
			},
			UpdateExpression: 'SET approved = :app, times.approved = :dt',
			ExpressionAttributeValues: {
				':app': true,
				':dt': new Date().toISOString()
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

	public deleteApplication: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const result: DriverApplicationDeleteResult = {
			success: true
		};

		const userId: string = JSON.parse(event.body).userId;

		try {
			await this._deleteApplication(userId);
			await PubManager.publishDelete('admin/driver-applications', DRIVER_APPLICATION_INDEX, userId);
			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	private _deleteApplication = (userId: string): DeleteResult => {

		const params: DeleteItemInput = {
			TableName: DRIVER_APPLICATION_TABLE,
			Key: {
				[DRIVER_APPLICATION_INDEX]: userId
			}
		};

		return this.dynamo.delete(params).promise();
	}

}
