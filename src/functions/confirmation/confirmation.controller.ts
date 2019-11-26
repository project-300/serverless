import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import { GetResult, GetResultPromise, UpdateResult } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { ConfirmationData, ConfirmationResult } from './confirmation.interfaces';
import { ApiEvent, ApiHandler, ApiResponse } from '../../responses/api.types';
import UpdateItemInput = DocumentClient.UpdateItemInput;
import GetItemInput = DocumentClient.GetItemInput;

export class ConfirmationController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient(
		process.env.IS_OFFLINE ? { region: 'localhost', endpoint: 'http://localhost:8000' } : { }
	);

	public confirmAccount: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const result: ConfirmationResult = {
			success: true
		};

		const data: ConfirmationData = JSON.parse(event.body);

		try {
			const email: GetResult = await this._getUnconfirmedEmail(data.userId);
			if (!email.Item) ResponseBuilder.notFound('User not found', 'User not found');
			await this._updateConfirmation(data.userId, email.Item.unconfirmedEmail);
			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _getUnconfirmedEmail = (userId: string): GetResultPromise => {
		const params: GetItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			}
		};

		return this.dynamo.get(params).promise();
	}

	private _updateConfirmation = (userId: string, email: string): UpdateResult => {
		const params: UpdateItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			},
			UpdateExpression: 'SET confirmed = :confirmed, times.confirmed = :now, email = :email REMOVE unconfirmedEmail',
			ExpressionAttributeValues: {
				':confirmed': true,
				':now': new Date().toISOString(),
				':email': email
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}
