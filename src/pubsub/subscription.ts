import { CollectionItem } from '@project-300/common-types';
import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ConnectionItem } from '../$connect/connect.interfaces';
import { SUBSCRIPTION_INDEX } from '../constants/indexes';
import { SUBSCRIPTION_TABLE } from '../constants/tables';
import { SubscriptionSchema } from '../interfaces/schemas';
import { ApiEvent } from '../responses/api.types';
import { GetResult, GetResultPromise, UpdateResult } from '../responses/dynamodb.types';
import PubManager from './publication';
import GetItemInput = DocumentClient.GetItemInput;
import PutItemInput = DocumentClient.PutItemInput;
import UpdateItemInput = DocumentClient.UpdateItemInput;

class SubscriptionManager {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public subscribe = async (event: ApiEvent, sub: string, objectId: string, data?: CollectionItem | CollectionItem[], autoPush?: boolean): Promise<void> => {
		const checkResponse: GetResult = await this._checkForExistingSubscription(sub);
		const connectionId: string = event.requestContext.connectionId;
		const userId: string = JSON.parse(event.body).userId;
		const subscription: SubscriptionSchema = checkResponse.Item as SubscriptionSchema;

		if (checkResponse.Item) {
			const connectionExists: boolean = await this._checkForExistingConnection(subscription, connectionId);

			if (connectionExists) return;

			await this._addSubConnection(sub, connectionId, userId);
		} else {
			await this._saveSubscription(sub, connectionId, userId);
		}

		if (autoPush) await PubManager.publish(event.requestContext.connectionId, sub, objectId, data, true);
	}

	public unsubscribe = async (sub: string, connectionId: string): Promise<void> => {
		await this._deleteConnection(sub, connectionId);
	}

	private _checkForExistingSubscription = (sub: string): GetResultPromise => {
		const params: GetItemInput = {
			TableName: SUBSCRIPTION_TABLE,
			Key: {
				[SUBSCRIPTION_INDEX]: sub
			}
		};

		return this.dynamo.get(params).promise();
	}

	private _saveSubscription = (sub: string, connectionId: string, userId: string): UpdateResult => {
		const now: string = new Date().toISOString();

		const params: PutItemInput = {
			TableName: SUBSCRIPTION_TABLE,
			Item: {
				[SUBSCRIPTION_INDEX]: sub,
				connections: [ {
					connectionId,
					userId,
					subscribedAt: now
				} ]
			}
		};

		return this.dynamo.put(params).promise();
	}

	private _addSubConnection = (sub: string, connectionId: string, userId: string): UpdateResult => {
		const now: string = new Date().toISOString();

		const params: UpdateItemInput = {
			TableName: SUBSCRIPTION_TABLE,
			Key: {
				[SUBSCRIPTION_INDEX]: sub
			},
			UpdateExpression: 'SET connections = list_append(connections, :con)',
			ExpressionAttributeValues: {
				':con': [ {
					connectionId,
					userId,
					subscribedAt: now
				} ]
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

	private _checkForExistingConnection = async (storedSub: SubscriptionSchema, connectionId: string): Promise<boolean> => {
		const existingConnection: ConnectionItem = storedSub.connections.find((con: ConnectionItem) =>
	  		con.connectionId === connectionId
		);

		return !!existingConnection;
	}

	private _deleteConnection = async (sub: string, connectionId: string): UpdateResult => {
		const index: number = await this._getConnectionIndex(sub, connectionId);

		if (index < 0) return;

		const params: UpdateItemInput = {
			TableName: SUBSCRIPTION_TABLE,
			Key: {
				[SUBSCRIPTION_INDEX]: sub
			},
			UpdateExpression: `REMOVE connections[${index}]`,
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

	private _getConnectionIndex = async (sub: string, connectionId: string): Promise<number> => {
		const params: GetItemInput = {
			TableName: SUBSCRIPTION_TABLE,
			Key: {
				[SUBSCRIPTION_INDEX]: sub
			}
		};

		const res: GetResult = await this.dynamo.get(params).promise();
		return res.Item.connections.map((con: ConnectionItem) => con.connectionId).indexOf(connectionId);
	}

}

const SubManager: SubscriptionManager = new SubscriptionManager();

export default SubManager;
