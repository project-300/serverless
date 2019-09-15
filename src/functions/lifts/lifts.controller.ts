import * as AWS from 'aws-sdk';
import { ScanResult, ScanResultPromise } from '../../responses/dynamodb.types';
import { ApiEvent, ApiHandler } from '../../responses/api.types';
import { DocumentClient, ScanInput } from 'aws-sdk/clients/dynamodb';
import SubManager from '../../pubsub/subscription';
import { LIFT_INDEX } from '../../constants/indexes';
import { LIFT_TABLE } from '../../constants/tables';
// import * from '@project-300/common-types/lib/index';

export class LiftsController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public getLifts: ApiHandler = async (event: ApiEvent): Promise<object> => {

		const body = JSON.parse(event.body);

		console.log(body);

		try {
			const data: ScanResult = await this._lifts();

			if (body.subscribe) {
				await SubManager.subscribe(
					event,
					body.subscription,
					LIFT_INDEX,
					data.Items,
					true
				);
			} else {
				await SubManager.unsubscribe(body.subscription, event.requestContext.connectionId);
			}

			return {
				statusCode: 200,
				headers: {
					'Access-Control-Allow-Origin': '*'
				},
				body: data
			};
		} catch (err) {
			return {
				statusCode: err.statusCode ? err.statusCode : 500,
				headers: {
					'Access-Control-Allow-Origin': '*'
				},
				body: JSON.stringify({
					error: err.name ? err.name : 'Exception',
					message: err.message ? err.message : 'Unknown error'
				})
			};
		}
	}

	private _lifts = (): ScanResultPromise => {
		const params: ScanInput = {
			TableName: LIFT_TABLE
		};

		return this.dynamo.scan(params).promise();
	}
}
