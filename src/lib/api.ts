import * as AWS from 'aws-sdk';
import { ApiEvent } from '../responses/api.types';

const API = (event: ApiEvent): AWS.ApiGatewayManagementApi => {
	const endpoint: string = `${event.requestContext.domainName}/${event.requestContext.stage}`;
	return new AWS.ApiGatewayManagementApi({
	   apiVersion: '2018-11-29',
	   endpoint
   });
};

export default API;
