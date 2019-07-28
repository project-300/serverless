import * as AWS from 'aws-sdk';

const API = (event): AWS.ApiGatewayManagementApi => {
    const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
    return new AWS.ApiGatewayManagementApi({
        apiVersion: "2018-11-29",
        endpoint: endpoint
    });
};

export default API;
