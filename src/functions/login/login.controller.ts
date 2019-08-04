import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import { PutResult } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { CognitoLoginResponse, LoginResult } from './login.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.types';
import UpdateItemInput = DocumentClient.UpdateItemInput;

export class LoginController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public login: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: LoginResult = {
			success: true
		};

		try {
			await this._saveCognitoData(event);
			ResponseBuilder.ok<LoginResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback);
		}
	}

	private _saveCognitoData = (event: ApiEvent): PutResult => {
		const data: CognitoLoginResponse = JSON.parse(event.body);

		const params: UpdateItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: data.signInUserSession.accessToken.payload.sub
			},
			UpdateExpression: 'set times.lastLogin = :now',
			ExpressionAttributeValues: {
				':now': new Date().toISOString()
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}
