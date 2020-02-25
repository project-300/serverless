import { SubscriptionError, SubscriptionNotificationPayload, SubscriptionPayload } from '@project-300/common-types';
import * as AWS from 'aws-sdk';
import { PostToConnectionRequest } from 'aws-sdk/clients/apigatewaymanagementapi';
import { WEBSOCKET_ENDPOINT } from '../../../../environment/env';
import { WsPostResult } from '../../../api-shared-modules/src';
import { SubscriptionData } from '../pubsub/subscription';

export default class API {

	// public constructor(private subManager: SubscriptionManager) { }

	private APIManager: AWS.ApiGatewayManagementApi =
		new AWS.ApiGatewayManagementApi({
			apiVersion: '2018-11-29',
			endpoint: WEBSOCKET_ENDPOINT
		}
	);

	public post = async (
		subscriptionData: SubscriptionData,
		data: SubscriptionPayload | SubscriptionError | SubscriptionNotificationPayload | { connectionId: string; userId: string }
	): Promise<WsPostResult> => {
		const params: PostToConnectionRequest = {
			ConnectionId: subscriptionData.connectionId,
			Data: JSON.stringify(data)
		};

		const res: WsPostResult =
			await this.APIManager
				.postToConnection(params)
				.promise()
				.catch((e: Error) => {
					console.log(e);
					// User has possibly disconnected without the $disconnect firing
					// await this.subManager.unsubscribe(subscriptionData);
				});

		return res;
	}

}
