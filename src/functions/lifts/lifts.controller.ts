import * as AWS from 'aws-sdk';
import { ScanResult, ScanResultPromise } from '../../responses/dynamodb.types';
import { ApiEvent, ApiHandler } from '../../responses/api.types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export class LiftsController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public check: ApiHandler = async (event: ApiEvent): Promise<void> => {
		try {
			const response: ScanResult = await this._getLifts;
		} catch (err) {

		}
	}

	private _getLifts = (): ScanResultPromise => {

	}
}
