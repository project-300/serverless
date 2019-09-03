import * as AWS from 'aws-sdk';
import { PostToConnectionRequest } from 'aws-sdk/clients/apigatewaymanagementapi';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ConnectionItem } from '../$connect/connect.interfaces';
import { SUBSCRIPTION_INDEX } from '../constants/indexes';
import { SUBSCRIPTION_TABLE } from '../constants/tables';
import API from '../lib/api';
import { GetResult } from '../responses/dynamodb.types';
import GetItemInput = DocumentClient.GetItemInput;

export enum PublishType {
	QUERY = 'QUERY',
	INSERT = 'INSERT',
	UPDATE = 'UPDATE',
	DELETE = 'DELETE'
}

class PublicationManager {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public publish = (connectionId: string, sub: string, data: object | object[]): void => {
		this._sendToConnections([ connectionId ], sub, PublishType.QUERY, data);
	}

	public publishInsert = async (sub: string, data: object | object[]): Promise<void> => {
		const connectionIds: string[] = await this._getConnectionIds(sub);
		this._sendToConnections(connectionIds, sub, PublishType.INSERT, data);
	}

	public publishUpdate = async (sub: string, data: object | object[]): Promise<void> => {
		const connectionIds: string[] = await this._getConnectionIds(sub);
		this._sendToConnections(connectionIds, sub, PublishType.UPDATE, data);
	}

	public publishDelete = async (sub: string, data: string | string[]): Promise<void> => {
		const connectionIds: string[] = await this._getConnectionIds(sub);
		this._sendToConnections(connectionIds, sub, PublishType.DELETE, data);
	}

	private _getConnectionIds = async (sub: string): Promise<string[]> => {
		const params: GetItemInput = {
			TableName: SUBSCRIPTION_TABLE,
			Key: {
				[SUBSCRIPTION_INDEX]: sub
			},
			ProjectionExpression: 'connections'
		};

		const result: GetResult = await this.dynamo.get(params).promise();
		return result.Item.connections.map((con: ConnectionItem) => con.connectionId);
	}

	private _sendToConnections = (connections: string[], sub: string, type: PublishType, data: object | object[] | string | string[]): void => {
		if (!connections.length) return;

		connections.map(async (connectionId: string) => {
			if (data instanceof Array) data.forEach((item: object | string) => this._sendDataObject(connectionId, sub, type, item));
			else await this._sendDataObject(connectionId, sub, type, data);
		});
	}

	private _sendDataObject = async (connectionId: string, sub: string, type: PublishType, data: object | string): Promise<void> => {
		const params: PostToConnectionRequest = {
			ConnectionId: connectionId,
			Data: JSON.stringify({
				subscription: sub,
				type,
				data
			})
		};

		await API()
			.postToConnection(params)
			.promise();
	}

}

const PubManager: PublicationManager = new PublicationManager();

export default PubManager;
