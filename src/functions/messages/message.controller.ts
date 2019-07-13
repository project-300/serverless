import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.interfaces';
import { ResponseBuilder } from '../../responses/response-builder';
import { MessageResult } from './message.interfaces';
import * as AWS from 'aws-sdk';

export class MessageController {

    private dynamo: any = new AWS.DynamoDB.DocumentClient();

    public sendMessage: ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback): void => {
        const result: MessageResult = {
            success: true
        };

        this.sendMessageToAllConnected(event).then(() => {
            ResponseBuilder.ok<MessageResult>(result, callback);
        }).catch (err => {
            ResponseBuilder.internalServerError(err, callback);
        });
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
            TableName: 'ConnectionIds',
            ProjectionExpression: 'connectionId'
        };

        return this.dynamo.scan(params).promise();
    };

    private send = (event, connectionId) => {
        const body = JSON.parse(event.body);
        const postData = body.data;

        const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
        const apigwManagementApi = new AWS.ApiGatewayManagementApi({
            apiVersion: "2018-11-29",
            endpoint: endpoint
        });

        const params = {
            ConnectionId: connectionId,
            Data: postData
        };
        return apigwManagementApi.postToConnection(params).promise();
    };

}
