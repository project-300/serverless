import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { PutResult } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import { CognitoSignupResponse, SignupSuccessResult } from './signup.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.types';
import PutItemInput = DocumentClient.PutItemInput;

export class SignupController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public signup: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: SignupSuccessResult = {
			success: true
		};

		try {
			await this.saveUserDetails(event);
			ResponseBuilder.ok<SignupSuccessResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback, 'Unable to save user details');
		}
	}

	private saveUserDetails = (event: ApiEvent): PutResult => {
		const data: CognitoSignupResponse = JSON.parse(event.body);
		const userId: string = data.userSub;
		const confirmed: boolean = data.userConfirmed;
		const now: string = new Date().toISOString();

		const params: PutItemInput = {
			TableName: USER_TABLE,
			Item: {
				[USERS_INDEX]: userId,
				confirmed,
				userType: 'Passenger',
				times: {
					signedUp: now
				}
			}
		};

		return this.dynamo.put(params).promise();
	}

}
