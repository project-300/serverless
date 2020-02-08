import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { CONNECTION_IDS_INDEX } from '../constants/indexes';
import { CONNECTION_IDS_TABLE } from '../constants/tables';
import { DeleteResult, ResponseBuilder, ApiEvent, ApiHandler, ApiResponse } from '../..';
import { DisconnectResult } from './disconnect.interfaces';
import DeleteItemInput = DocumentClient.DeleteItemInput;

export class DisconnectController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient(
		process.env.IS_OFFLINE ? { region: 'localhost', endpoint: 'http://localhost:8000' } : { }
	);

	public disconnect: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const result: DisconnectResult = {
			success: true
		};

		try {
			await this._deleteConnection(event.requestContext.connectionId);
			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _deleteConnection = (connectionId: string): DeleteResult => {
		const params: DeleteItemInput = {
			TableName: CONNECTION_IDS_TABLE,
			Key: {
				[CONNECTION_IDS_INDEX]: connectionId
			}
		};

		return this.dynamo.delete(params).promise();
	}

}
