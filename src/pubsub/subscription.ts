import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { SUBSCRIPTION_INDEX } from '../constants/indexes';
import { SUBSCRIPTION_TABLE } from '../constants/tables';
import { ApiEvent } from '../responses/api.types';
import { GetResult, GetResultPromise, UpdateResult } from '../responses/dynamodb.types';
import PubManager, { PublishType } from './publication';
import GetItemInput = DocumentClient.GetItemInput;
import PutItemInput = DocumentClient.PutItemInput;
import UpdateItemInput = DocumentClient.UpdateItemInput;

class SubscriptionManager {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public subscribe = async (event: ApiEvent, sub: string, connectionId: string, autoPush: boolean, data?: object | object[]): Promise<void> => {
		const checkResponse: GetResult = await this._checkForExistingSubscription(sub);

		if (checkResponse.Item) await this._addSubConnection(sub, connectionId);
		else await this._saveSubscription(sub, connectionId);

		if (autoPush) await PubManager.publish(event, sub, PublishType.query, data);
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

	private _saveSubscription = (sub: string, connectionId: string): UpdateResult => {
		const now: string = new Date().toISOString();

		const params: PutItemInput = {
			TableName: SUBSCRIPTION_TABLE,
			Item: {
				[SUBSCRIPTION_INDEX]: sub,
				connections: [ {
					connectionId,
					subscribedAt: now
				} ]
			}
		};

		return this.dynamo.put(params).promise();
	}

	private _addSubConnection = (sub: string, connectionId: string): UpdateResult => {
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
					subscribedAt: now
				} ]
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}

const SubManager: SubscriptionManager = new SubscriptionManager();

export default SubManager;
