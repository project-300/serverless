import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.interfaces';
import { ResponseBuilder } from '../../responses/response-builder';
import { LoginResult } from '../login/login.interfaces';
import { CognitoSignupResponse, SignupResult } from './signup.interfaces';

export class SignupController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public signup: ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback): void => {
        const result: SignupResult = {
            success: true
        };

        this.saveUserDetails(event)
            .then(() => ResponseBuilder.ok<LoginResult>(result, callback))
            .catch(err => ResponseBuilder.internalServerError(err, callback));
    }

    private saveUserDetails = (event: ApiEvent): Promise<object> => {
        const data: CognitoSignupResponse = JSON.parse(event.body).data;
        const userId: string = data.userSub;
        const confirmed: boolean = data.userConfirmed;
        const now: string = new Date().toISOString();

        const params = {
            TableName: USER_TABLE,
            Item: {
                [USERS_INDEX]: userId,
                confirmed,
                times: {
                    signedUp: now
                }
            }
        };

        return this.dynamo.put(params).promise();
    }

}
