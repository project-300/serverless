import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { PutResultPromise } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import { SignupPayload, SignupSuccessResult } from './signup.interfaces';
import { ApiEvent, ApiHandler, ApiResponse } from '../../responses/api.types';
import PutItemInput = DocumentClient.PutItemInput;

export class SignupController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient(
		process.env.IS_OFFLINE ? { region: 'localhost', endpoint: 'http://localhost:8000' } : { }
	);

	public signup: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const result: SignupSuccessResult = {
			success: true
		};

		try {
			await this.saveUserDetails(event);
			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to save user details');
		}
	}

	private saveUserDetails = (event: ApiEvent): PutResultPromise => {
		const data: SignupPayload = JSON.parse(event.body);
		const { auth, email, username }: SignupPayload = data;
		const userId: string = auth.userSub;
		const confirmed: boolean = auth.userConfirmed;
		const now: string = new Date().toISOString();

		const params: PutItemInput = {
			TableName: USER_TABLE,
			Item: {
				[USERS_INDEX]: userId,
				unconfirmedEmail: email,
				username,
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
