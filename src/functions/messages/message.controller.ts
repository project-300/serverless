import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { CONNECTION_IDS_INDEX } from '../../constants/indexes';
import { CONNECTION_IDS_TABLE } from '../../constants/tables';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.interfaces';
import { ResponseBuilder } from '../../responses/response-builder';
import { MessageResult } from './message.interfaces';
import API from '../../lib/api';
import * as AWS from 'aws-sdk';

export class MessageController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public sendMessage: ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback): void => {
        const result: MessageResult = {
            success: true
        };

        this.sendMessageToAllConnected(event)
            .then(() => ResponseBuilder.ok<MessageResult>(result, callback))
            .catch (err => ResponseBuilder.internalServerError(err, callback));
    };

    private sendMessageToAllConnected = (event) => {
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
        const body = JSON.parse(event.body);
        const postData = body.data;

        const params = {
            ConnectionId: connectionId,
            Data: postData
        };

        return API(event).postToConnection(params).promise();
    };

}
