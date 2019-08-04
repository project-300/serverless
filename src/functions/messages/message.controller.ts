import * as AWS from 'aws-sdk';
import API from '../../lib/api';
import { PostToConnectionRequest } from 'aws-sdk/clients/apigatewaymanagementapi';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ConnectionItem } from '../../$connect/connect.interfaces';
import { CONNECTION_IDS_INDEX } from '../../constants/indexes';
import { CONNECTION_IDS_TABLE } from '../../constants/tables';
import { ResponseBuilder } from '../../responses/response-builder';
import { MessageData, MessageResult } from './message.interfaces';
import { ScanResult, ScanResultPromise } from '../../responses/dynamodb.types';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler, WsPostResult } from '../../responses/api.types';
import ScanInput = DocumentClient.ScanInput;

export class MessageController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public sendMessage: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: MessageResult = {
			success: true
		};

		try {
			await this._sendMessageToAllConnected(event);
			ResponseBuilder.ok<MessageResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback);
		}
	}

	private _sendMessageToAllConnected = async (event: ApiEvent): Promise<void> => {
		const result: ScanResult = await this._getConnectionIds();

		result.Items.map((connection: ConnectionItem) => this._send(event, connection.connectionId));
	}

	private _getConnectionIds = (): ScanResultPromise => {
		const params: ScanInput = {
			TableName: CONNECTION_IDS_TABLE,
			ProjectionExpression: CONNECTION_IDS_INDEX
		};

		return this.dynamo.scan(params).promise();
	}

	private _send = (event: ApiEvent, connectionId: string): Promise<WsPostResult> => {
		const data: MessageData = JSON.parse(event.body);

		const params: PostToConnectionRequest = {
			ConnectionId: connectionId,
			Data: data.message
		};

		return API(event)
			.postToConnection(params)
			.promise();
	}

}
