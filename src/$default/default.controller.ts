import { ConnectResult } from '../$connect/connect.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../responses/api.interfaces';
import * as AWS from 'aws-sdk';
import { ResponseBuilder } from '../responses/response-builder';
import { DefaultResult } from './default.interfaces';

export class DefaultController {

    public default: ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback): void => {
        const result: DefaultResult = {
            success: true
        };

        const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;

        const apigwManagementApi = new AWS.ApiGatewayManagementApi({
            apiVersion: "2018-11-29",
            endpoint: endpoint
        });

        const params = {
            ConnectionId: event.requestContext.connectionId,
            Data: 'No function specified'
        };

        apigwManagementApi
            .postToConnection(params)
            .promise()
            .then(() => {
                ResponseBuilder.ok<ConnectResult>(result, callback);
            })
            .catch(err => {
                ResponseBuilder.internalServerError(err, callback);
            });
    }

}
