import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { CONNECTION_IDS_INDEX } from '../constants/indexes';
import { CONNECTION_IDS_TABLE } from '../constants/tables';
import { DeleteResult } from '../responses/dynamodb.types';
import { ResponseBuilder } from '../responses/response-builder';
import { DisconnectResult } from './disconnect.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../responses/api.types';
import DeleteItemInput = DocumentClient.DeleteItemInput;

export class DisconnectController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public disconnect: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: DisconnectResult = {
			success: true
		};

		try {
			await this._deleteConnection(event.requestContext.connectionId);
			ResponseBuilder.ok<DisconnectResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback);
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
