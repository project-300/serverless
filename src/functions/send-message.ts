const AWS2 = require('aws-sdk');
let dynamo2 = new AWS2.DynamoDB.DocumentClient();

require('aws-sdk/clients/apigatewaymanagementapi');

const successfulResponse2 = {
    statusCode: 200,
    body: 'everything is alright'
};

module.exports.sendMessageHandler = (event, _context, callback) => {
    sendMessageToAllConnected(event).then(() => {
        callback(null, successfulResponse2)
    }).catch (err => {
        callback(null, JSON.stringify(err));
    });
}

const sendMessageToAllConnected = (event) => {
    return getConnectionIds().then(connectionData => {
        return connectionData.Items.map(connectionId => {
            return send(event, connectionId.connectionId);
        });
    });
}

const getConnectionIds = () => {
    const params = {
        TableName: 'ConnectionIds',
        ProjectionExpression: 'connectionId'
    };

    return dynamo2.scan(params).promise();
}

const send = (event, connectionId) => {
    const body = JSON.parse(event.body);
    const postData = body.data;

    const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
    const apigwManagementApi = new AWS2.ApiGatewayManagementApi({
        apiVersion: "2018-11-29",
        endpoint: endpoint
    });

    const params = {
        ConnectionId: connectionId,
        Data: postData
    };
    return apigwManagementApi.postToConnection(params).promise();
};
