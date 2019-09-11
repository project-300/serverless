import * as AWS from 'aws-sdk';
import { PostToConnectionRequest } from 'aws-sdk/clients/apigatewaymanagementapi';
import { WEBSOCKET_ENDPOINT } from '../../environment/env';
import SubManager from '../pubsub/subscription';
import { WebsocketResponse, WsPostResult } from '../responses/api.types';

class API {

	private static APIManager: AWS.ApiGatewayManagementApi =
		new AWS.ApiGatewayManagementApi({
		apiVersion: '2018-11-29',
		endpoint: WEBSOCKET_ENDPOINT
	});

	public static post = async (connectionId: string, data: WebsocketResponse): Promise<WsPostResult> => {
		const params: PostToConnectionRequest = {
			ConnectionId: connectionId,
			Data: JSON.stringify(data)
		};

		const res: WsPostResult =
			await API.APIManager
				.postToConnection(params)
				.promise()
				.catch(() => {
					SubManager.unsubscribe(data.subscription, connectionId);
				});

		return res;
	}

}

export default API;
