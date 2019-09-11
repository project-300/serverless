import * as AWS from 'aws-sdk';
import * as ApiGatewayManagementApi from 'aws-sdk/clients/apigatewaymanagementapi';
import { WEBSOCKET_ENDPOINT } from '../../environment/env';
import { WsPostResult } from '../responses/api.types';

class API {

	private static APIManager: AWS.ApiGatewayManagementApi =
		new AWS.ApiGatewayManagementApi({
		apiVersion: '2018-11-29',
		endpoint: WEBSOCKET_ENDPOINT
	});

	public static post = async (params: ApiGatewayManagementApi.PostToConnectionRequest): Promise<WsPostResult> =>
		API.APIManager.postToConnection(params).promise()

}

export default API;
