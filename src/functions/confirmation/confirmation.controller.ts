import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.interfaces';
import { ResponseBuilder } from '../../responses/response-builder';
import { LoginResult } from '../login/login.interfaces';
import { ConfirmationResult } from './confirmation.interfaces';

export class ConfirmationController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public confirmAccount: ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback): void => {
        const result: ConfirmationResult = {
            success: true
        };

        this.updateConfirmation(event)
            .then(() => ResponseBuilder.ok<LoginResult>(result, callback))
            .catch(err => ResponseBuilder.internalServerError(err, callback));
    }

    private updateConfirmation = (event: ApiEvent): Promise<object> => {
        const data = JSON.parse(event.body).data;

        const params = {
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
