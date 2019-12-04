import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ResponseBuilder } from '../../../responses/response-builder';
import { ApiEvent, ApiHandler, ApiResponse } from '../../../responses/api.types';
import { GetResultPromise, ScanResult } from '../../../responses/dynamodb.types';
import { JOURNEY_TABLE } from '../../../constants/tables';
import { ConfirmationData } from '../../confirmation/confirmation.interfaces';
import ScanInput = DocumentClient.ScanInput;

export class JourneyController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public myJourneys: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const data: ConfirmationData = JSON.parse(event.body);

		try {
			const response: ScanResult = await this._getMyJourneys(data.userId);

			return ResponseBuilder.ok({ success: true, journeys: response.Items });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _getMyJourneys = (userId: string): GetResultPromise => {
		const params: ScanInput = {
			TableName: JOURNEY_TABLE,
			FilterExpression: '#d.#u = :userId',
			ExpressionAttributeNames: {
				'#d': 'driver',
				'#u': 'userId'
			},
			ExpressionAttributeValues: {
				':userId': userId
			}
		};

		return this.dynamo.scan(params).promise();
	}

}
