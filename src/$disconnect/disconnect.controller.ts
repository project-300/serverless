import * as AWS from 'aws-sdk';
import { CONNECTION_IDS_TABLE } from '../constants/tables';
import { DisconnectResult } from './disconnect.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../responses/api.interfaces';
import { ResponseBuilder } from '../responses/response-builder';

export class DisconnectController {

    private dynamo: any = new AWS.DynamoDB.DocumentClient();

    public disconnect: ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback): void => {
        const result: DisconnectResult = {
            success: true
        };

        this.deleteConnection(event.requestContext.connectionId)
            .then(() => {
                ResponseBuilder.ok<DisconnectResult>(result, callback);
            })
            .catch(err => {
                ResponseBuilder.internalServerError(err, callback);
            });
    }

    private deleteConnection = connectionId => {
        const params = {
            TableName: CONNECTION_IDS_TABLE,
            Key: {
                connectionId: connectionId
            }
        };

        return this.dynamo.delete(params).promise();
    };

}
