import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ConnectionItem } from '../$connect/connect.interfaces';
import { SUBSCRIPTION_INDEX } from '../constants/indexes';
import { SUBSCRIPTION_TABLE } from '../constants/tables';
import API from '../lib/api';
import { WsPostResult } from '../responses/api.types';
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

	public publish = (connectionId: string, sub: string, objectId: string, data: object | object[], sendCollection: boolean): void => {
		this._sendToConnections([ connectionId ], sub, PublishType.QUERY, objectId, data, sendCollection);
	}

	public publishInsert = async (sub: string, objectId: string, data: object | object[]): Promise<void> => {
		const connectionIds: string[] = await this._getConnectionIds(sub);
		this._sendToConnections(connectionIds, sub, PublishType.INSERT, objectId, data, false);
	}

	public publishUpdate = async (sub: string, objectId: string, data: object | object[]): Promise<void> => {
		const connectionIds: string[] = await this._getConnectionIds(sub);
		this._sendToConnections(connectionIds, sub, PublishType.UPDATE, objectId, data, false);
	}

	public publishDelete = async (sub: string, objectId: string, data: string | string[]): Promise<void> => {
		const connectionIds: string[] = await this._getConnectionIds(sub);
		this._sendToConnections(connectionIds, sub, PublishType.DELETE, objectId, data, false);
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

	private _sendToConnections = (
		connections: string[],
		sub: string,
		type: PublishType,
		objectId: string,
		data: object | object[] | string | string[],
		sendCollection: boolean
	): void => {
		if (!connections.length) return;

		const isCollection: boolean = sendCollection && data instanceof Array;

		connections.map(async (connectionId: string) => {
			if (!sendCollection && data instanceof Array) {
				data.forEach((item: object | string) => this._sendDataObject(connectionId, sub, type, objectId, item, isCollection));
			} else {
				await this._sendDataObject(connectionId, sub, type, objectId, data, isCollection);
			}
		});
	}

	private _sendDataObject = async (
		connectionId: string,
		subscription: string,
		type: PublishType,
		objectId: string,
		data: object | string,
		isCollection: boolean
	): Promise<WsPostResult> =>
		API.post(connectionId, {
			subscription,
			type,
			objectId,
			isCollection,
			data
		})

}

const PubManager: PublicationManager = new PublicationManager();

export default PubManager;
