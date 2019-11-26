import * as AWS from 'aws-sdk';
import API from '../lib/api';
import { ScanInput } from 'aws-sdk/clients/dynamodb';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { CONNECTION_IDS_INDEX } from '../constants/indexes';
import { CONNECTION_IDS_TABLE } from '../constants/tables';
import { ResponseBuilder } from '../responses/response-builder';
import { ConnectionItem, ConnectResult } from './connect.interfaces';
import { PutResult, ScanResult, ScanResultPromise } from '../responses/dynamodb.types';
import { ApiEvent, ApiHandler, ApiResponse, WsPostResult } from '../responses/api.types';
import PutItemInput = DocumentClient.PutItemInput;

export class ConnectController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient(
		process.env.IS_OFFLINE ? { region: 'localhost', endpoint: 'http://localhost:8000' } : { }
	);

	public connect: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const result: ConnectResult = {
			success: true
		};

		try {
			await this._addConnection(event.requestContext.connectionId);
			await this._alertUsers(event);
			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _addConnection = (connectionId: string): PutResult => {
		const params: PutItemInput = {
			TableName: CONNECTION_IDS_TABLE,
			Item: {
				[CONNECTION_IDS_INDEX]: connectionId
			}
		};

		return this.dynamo.put(params).promise();
	}

	private _alertUsers = async (event: ApiEvent): Promise<void> => {
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

	private _send = (event: ApiEvent, connectionId: string): Promise<WsPostResult> =>
		API.post(connectionId, { subscription: '$connect', notice: `${event.requestContext.connectionId} has joined` })

}
