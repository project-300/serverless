import { ResponseBuilder } from './../../responses/response-builder';
import { ApiCallback } from './../../responses/api.types';
import * as AWS from 'aws-sdk';
import { ScanResult, ScanResultPromise } from '../../responses/dynamodb.types';
import { ApiEvent, ApiHandler, ApiContext } from '../../responses/api.types';
import { DocumentClient, ScanInput } from 'aws-sdk/clients/dynamodb';
import SubManager from '../../pubsub/subscription';
import { LIFT_INDEX } from '../../constants/indexes';
import { LIFT_TABLE } from '../../constants/tables';

export interface LiftsSubscriptionResult {
	success: boolean;
}

export class LiftsController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public getLifts: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: LiftsSubscriptionResult = {
			success: true
		};

		const body = JSON.parse(event.body);

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
			ResponseBuilder.ok<LiftsSubscriptionResult>(result, callback);
		} catch (err) {
			console.log(err);
			ResponseBuilder.internalServerError(err, callback);
		}
	}

	private _lifts = (): ScanResultPromise => {
		const params: ScanInput = {
			TableName: LIFT_TABLE
		};

		return this.dynamo.scan(params).promise();
	}
}
