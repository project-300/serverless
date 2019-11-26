import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import { UpdateResult } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { CognitoLoginResponse, LoginResult } from './login.interfaces';
import { ApiEvent, ApiHandler, ApiResponse } from '../../responses/api.types';
import UpdateItemInput = DocumentClient.UpdateItemInput;
import UpdateItemOutput = DocumentClient.UpdateItemOutput;

export class LoginController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient(
		process.env.IS_OFFLINE ? { region: 'localhost', endpoint: 'http://localhost:8000' } : { }
	);

	public login: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const result: LoginResult = {
			success: true
		};

		try {
			const response: UpdateItemOutput = await this._saveCognitoData(event);
			result.userId = response.Attributes.userId;
			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _saveCognitoData = (event: ApiEvent): UpdateResult => {
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
			ReturnValues: 'ALL_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}
