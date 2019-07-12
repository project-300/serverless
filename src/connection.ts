const AWS = require('aws-sdk');
let dynamo = new AWS.DynamoDB.DocumentClient();

require('aws-sdk/clients/apigatewaymanagementapi');

const successfulResponse = {
    statusCode: 200,
    body: 'everything is alright'
};

module.exports.connectionHandler = (event, _context, callback) => {
    if (event.requestContext.eventType === 'CONNECT') {
        addConnection(event.requestContext.connectionId)
            .then(() => {
                callback(null, successfulResponse);
            })
            .catch(err => {
                console.log(err);
                callback(null, JSON.stringify(err));
            });
    } else if (event.requestContext.eventType === 'DISCONNECT') {
        deleteConnection(event.requestContext.connectionId)
            .then(() => {
                callback(null, successfulResponse);
            })
            .catch(err => {
                console.log(err);
                callback(null, {
                    statusCode: 500,
                    body: 'Failed to connect: ' + JSON.stringify(err)
                });
            });
    }
};

const addConnection = connectionId => {
    const params = {
        TableName: 'ConnectionIds',
        Item: {
            connectionId: connectionId
        }
    };

    return dynamo.put(params).promise();
};

const deleteConnection = connectionId => {
    const params = {
        TableName: 'ConnectionIds',
        Key: {
            connectionId: connectionId
        }
    };

    return dynamo.delete(params).promise();
};
