import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import { UpdateResult } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { ConfirmationData, ConfirmationResult } from './confirmation.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.types';
import UpdateItemInput = DocumentClient.UpdateItemInput;

export class ConfirmationController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public confirmAccount: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: ConfirmationResult = {
			success: true
		};

		try {
			await this._updateConfirmation(event);
			ResponseBuilder.ok<ConfirmationResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback);
		}
	}

	private _updateConfirmation = (event: ApiEvent): UpdateResult => {
		const data: ConfirmationData = JSON.parse(event.body);

		const params: UpdateItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: data.userId
			},
			UpdateExpression: 'set confirmed = :confirmed, times.confirmed = :now',
			ExpressionAttributeValues: {
				':confirmed': true,
				':now': new Date().toISOString()
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}
