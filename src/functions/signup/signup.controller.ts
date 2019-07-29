import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { COGNITO_DATA_INDEX } from '../../constants/indexes';
import { COGNITO_DATA_TABLE } from '../../constants/tables';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.interfaces';
import { ResponseBuilder } from '../../responses/response-builder';
import { LoginResult } from '../login/login.interfaces';
import { SignupResult } from './signup.interfaces';
import * as UUID from 'uuid/v1';

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
        const body = JSON.parse(event.body);
        const data = body.data;

        const params = {
            TableName: COGNITO_DATA_TABLE,
            Item: {
                [COGNITO_DATA_INDEX]: UUID(),
                data
            }
        };

        return this.dynamo.put(params).promise();
    }

}
