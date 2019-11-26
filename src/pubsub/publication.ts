import { CollectionItem, SubscriptionPayload, SubscriptionPayloadData } from '@project-300/common-types';
import { PublishType } from '@project-300/common-types/lib/enums';
import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ConnectionItem } from '../$connect/connect.interfaces';
import { SUBSCRIPTION_INDEX } from '../constants/indexes';
import { SUBSCRIPTION_TABLE } from '../constants/tables';
import API from '../lib/api';
import { WsPostResult } from '../responses/api.types';
import { GetResult } from '../responses/dynamodb.types';
import GetItemInput = DocumentClient.GetItemInput;

class PublicationManager {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient(
		process.env.IS_OFFLINE ? { region: 'localhost', endpoint: 'http://localhost:8000' } : { }
	);

	public publish = (connectionId: string, sub: string, objectId: string, data: CollectionItem | CollectionItem[], sendCollection: boolean): void => {
		this._sendToConnections([ connectionId ], sub, PublishType.QUERY, objectId, data, sendCollection);
	}

	public publishInsert = async (sub: string, objectId: string, data: CollectionItem | CollectionItem[]): Promise<void> => {
		const connectionIds: string[] = await this._getConnectionIds(sub);
		this._sendToConnections(connectionIds, sub, PublishType.INSERT, objectId, data, false);
	}

	public publishUpdate = async (sub: string, objectId: string, data: CollectionItem | CollectionItem[]): Promise<void> => {
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
		subscription: string,
		type: PublishType,
		objectId: string,
		data: SubscriptionPayloadData,
		sendCollection: boolean
	): void => {
		if (!connections.length) return;

		const isCollection: boolean = sendCollection && data instanceof Array;

		connections.map(async (connectionId: string) => {
			if (!sendCollection && data instanceof Array) {
				data.forEach((item: CollectionItem | string) =>
					this._sendDataObject(connectionId, { subscription, type, objectId, data: item, isCollection }));
			} else {
				await this._sendDataObject(connectionId, { subscription, type, objectId, data, isCollection });
			}
		});
	}

	private _sendDataObject = async (connectionId: string, data: SubscriptionPayload): Promise<WsPostResult> => API.post(connectionId, data);

}

const PubManager: PublicationManager = new PublicationManager();

export default PubManager;
