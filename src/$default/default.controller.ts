import API from '../lib/api';
import { PostToConnectionRequest } from 'aws-sdk/clients/apigatewaymanagementapi';
import { ConnectResult } from '../$connect/connect.interfaces';
import { ResponseBuilder } from '../responses/response-builder';
import { DefaultResult } from './default.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler, WsPostResult } from '../responses/api.types';

export class DefaultController {

	public default: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: DefaultResult = {
			success: true
		};

		try {
			await this._replyWarning(event);
			ResponseBuilder.ok<ConnectResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback);
		}
	}

	private _replyWarning = (event: ApiEvent): Promise<WsPostResult> => {
		const params: PostToConnectionRequest = {
			ConnectionId: event.requestContext.connectionId,
			Data: JSON.stringify({ error: 'No function specified' })
		};

		return API()
			.postToConnection(params)
			.promise();
	}

}
