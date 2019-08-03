import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { COGNITO_DATA_INDEX } from '../../constants/indexes';
import { COGNITO_DATA_TABLE } from '../../constants/tables';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.interfaces';
import { ResponseBuilder } from '../../responses/response-builder';
import { CognitoLoginResponse, LoginResult } from './login.interfaces';
import * as AWS from 'aws-sdk';
import * as UUID from 'uuid/v1';

export class LoginController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public login: ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback): void => {
        const result: LoginResult = {
            success: true
        };

        this.saveCognitoData(event)
            .then(() => ResponseBuilder.ok<LoginResult>(result, callback))
            .catch(err => ResponseBuilder.internalServerError(err, callback));
    }

    private saveCognitoData = (event: ApiEvent): Promise<object> => {
        const data: CognitoLoginResponse = JSON.parse(event.body);

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
