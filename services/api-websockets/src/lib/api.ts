import { SubscriptionError, SubscriptionPayload } from '@project-300/common-types';
import * as AWS from 'aws-sdk';
import { PostToConnectionRequest } from 'aws-sdk/clients/apigatewaymanagementapi';
import { WEBSOCKET_ENDPOINT } from '../../../../environment/env';
import SubManager from '../pubsub/subscription';
import { WsPostResult } from '../../../api-shared-modules/src';

export default class API {

	private static APIManager: AWS.ApiGatewayManagementApi =
		new AWS.ApiGatewayManagementApi({
			apiVersion: '2018-11-29',
			endpoint: WEBSOCKET_ENDPOINT
		}
	);

	public static post = async (connectionId: string, data: SubscriptionPayload | SubscriptionError): Promise<WsPostResult> => {
		const params: PostToConnectionRequest = {
			ConnectionId: connectionId,
			Data: JSON.stringify(data)
		};

		const res: WsPostResult =
			await API.APIManager
				.postToConnection(params)
				.promise()
				.catch((e: Error) => {
					SubManager.unsubscribe(data.subscription, connectionId);
				});

		return res;
	}

}
