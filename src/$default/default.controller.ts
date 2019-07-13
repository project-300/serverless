import { ConnectResult } from '../$connect/connect.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../responses/api.interfaces';
import { ResponseBuilder } from '../responses/response-builder';
import { DefaultResult } from './default.interfaces';
import API from '../lib/api';

export class DefaultController {

    public default: ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback): void => {
        const result: DefaultResult = {
            success: true
        };

        const params = {
            ConnectionId: event.requestContext.connectionId,
            Data: 'No function specified'
        };

        API(event)
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
