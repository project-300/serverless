import * as AWS from 'aws-sdk';
import { WEBSOCKET_ENDPOINT } from '../../environment/env';

const API = (): AWS.ApiGatewayManagementApi =>
	new AWS.ApiGatewayManagementApi({
	   apiVersion: '2018-11-29',
	   endpoint: WEBSOCKET_ENDPOINT
	});

export default API;
