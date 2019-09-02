import * as AWS from 'aws-sdk';
import { PostToConnectionRequest } from 'aws-sdk/clients/apigatewaymanagementapi';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ConnectionItem } from '../$connect/connect.interfaces';
import { SUBSCRIPTION_INDEX } from '../constants/indexes';
import { SUBSCRIPTION_TABLE } from '../constants/tables';
import API from '../lib/api';
import { ApiEvent } from '../responses/api.types';
import { GetResult, GetResultPromise } from '../responses/dynamodb.types';
import GetItemInput = DocumentClient.GetItemInput;

export enum PublishType {
	'query',
	'new',
	'update',
	'delete'
}

class PublicationManager {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public publish = async (event: ApiEvent, sub: string, type: PublishType, data: object | object[]): Promise<void> => {
		const result: GetResult = await this._getConnectionIds(sub);

		result.Item.connections.map((connection: ConnectionItem) => {
			if (data instanceof Array) data.map((item: object) => {

				this._send(event, connection.connectionId, sub, type, item);
			});
			else this._send(event, connection.connectionId, sub, type, data);
		});
	}

	private _getConnectionIds = (sub: string): GetResultPromise => {
		const params: GetItemInput = {
			TableName: SUBSCRIPTION_TABLE,
			Key: {
				[SUBSCRIPTION_INDEX]: sub
			},
			ProjectionExpression: 'connections'
		};

		return this.dynamo.get(params).promise();
	}

	private _send = async (event: ApiEvent, connectionId: string, sub: string, type: PublishType, data: object | object[]): Promise<void> => {
		const params: PostToConnectionRequest = {
			ConnectionId: connectionId,
			Data: JSON.stringify({
				subscription: sub,
				type,
				data
			})
		};

		await API(event)
			.postToConnection(params)
			.promise();
	}

}

const PubManager: PublicationManager = new PublicationManager();

export default PubManager;
