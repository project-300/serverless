import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import { UpdateResult } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { DriverApplicationResult } from './driver-application.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.types';
import UpdateItemInput = DocumentClient.UpdateItemInput;

export class DriverApplicationController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public apply: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: DriverApplicationResult = {
			success: true
		};

		try {
			await this._updateUserType(event);
			ResponseBuilder.ok<DriverApplicationResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback);
		}
	}

	private _updateUserType = (event: ApiEvent): UpdateResult => {
		const userId: string = JSON.parse(event.body).userId;

		const params: UpdateItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			},
			UpdateExpression: 'set userType = :type',
			ExpressionAttributeValues: {
				':type': 'Driver'
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}
