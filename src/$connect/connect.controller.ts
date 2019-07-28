import { CONNECTION_IDS_INDEX } from '../constants/indexes';
import { CONNECTION_IDS_TABLE } from '../constants/tables';
import API from '../lib/api';
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
                this.alertUsers(event).then(() => {
                    ResponseBuilder.ok<ConnectResult>(result, callback);
                })
                .catch(err => {
                    ResponseBuilder.internalServerError(err, callback);
                });
            })
            .catch(err => {
                ResponseBuilder.internalServerError(err, callback);
            });
    };

    private addConnection = connectionId => {
        const params = {
            TableName: CONNECTION_IDS_TABLE,
            Item: {
                [CONNECTION_IDS_INDEX]: connectionId
            }
        };

        return this.dynamo.put(params).promise();
    };

    private alertUsers = event => {
        return this.getConnectionIds().then(connectionData => {
            return connectionData.Items.map(connectionId => {
                return this.send(event, connectionId.connectionId);
            });
        });
    };

    private getConnectionIds = () => {
        const params = {
            TableName: CONNECTION_IDS_TABLE,
            ProjectionExpression: CONNECTION_IDS_INDEX
        };

        return this.dynamo.scan(params).promise();
    };

    private send = (event, connectionId) => {
        const params = {
            ConnectionId: connectionId,
            Data: `${event.requestContext.connectionId} has joined`
        };

        return API(event).postToConnection(params).promise();
    };

}
