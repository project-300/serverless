import { ConnectResult } from './connect.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../responses/api.interfaces';
import { ResponseBuilder } from '../responses/response-builder';
import * as AWS from 'aws-sdk';

export class ConnectController {

    private dynamo: any = new AWS.DynamoDB.DocumentClient();

    public connect: ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback): void => {
        const result: ConnectResult = {
            success: true
        };

        this.addConnection(event.requestContext.connectionId)
            .then(() => {
                ResponseBuilder.ok<ConnectResult>(result, callback);
            })
            .catch(err => {
                ResponseBuilder.internalServerError(err, callback);
            });
    }

    private addConnection = connectionId => {
        const params = {
            TableName: 'ConnectionIds',
            Item: {
                connectionId: connectionId
            }
        };

        return this.dynamo.put(params).promise();
    };

}
