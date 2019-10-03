import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import { GetResult, GetResultPromise, UpdateResult } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { ConfirmationData, ConfirmationResult } from './confirmation.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.types';
import UpdateItemInput = DocumentClient.UpdateItemInput;
import GetItemInput = DocumentClient.GetItemInput;

export class ConfirmationController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public confirmAccount: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: ConfirmationResult = {
			success: true
		};

		const data: ConfirmationData = JSON.parse(event.body);

		try {
			const email: GetResult = await this._getUnconfirmedEmail(data.userId);
			if (!email.Item) ResponseBuilder.notFound('User not found', 'User not found', callback);
			await this._updateConfirmation(data.userId, email.Item.unconfirmedEmail);
			ResponseBuilder.ok<ConfirmationResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback);
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
