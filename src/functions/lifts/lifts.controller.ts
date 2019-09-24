import { LiftsSubscriptionResult, LiftAddedResult } from './lifts.interface';
import { ResponseBuilder } from './../../responses/response-builder';
import uuidv4 from 'uuidv4';
import { ApiCallback } from './../../responses/api.types';
import * as AWS from 'aws-sdk';
import PubManager from '../../pubsub/publication';
import { ScanResult, ScanResultPromise, PutResult, GetResult, GetResultPromise } from '../../responses/dynamodb.types';
import { ApiEvent, ApiHandler, ApiContext } from '../../responses/api.types';
import { DocumentClient, ScanInput } from 'aws-sdk/clients/dynamodb';
import SubManager from '../../pubsub/subscription';
import { LIFT_INDEX } from '../../constants/indexes';
import { LIFT_TABLE } from '../../constants/tables';
import { LiftObject } from '@project-300/common-types';
import PutItemInput = DocumentClient.PutItemInput;
import GetItemInput = DocumentClient.GetItemInput;

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

	private _lifts(): ScanResultPromise {
		const params: ScanInput = {
			TableName: LIFT_TABLE
		};

		return this.dynamo.scan(params).promise();
	}

	public addLift: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: LiftAddedResult = {
			success: true
		};

		try {
			const lift = JSON.parse(event.body);
			lift.liftId = uuidv4();
			await this._addLift(lift);

			const updatedLifts: GetResult = await this._getLift(lift);
			console.log(updatedLifts);
			await PubManager.publishUpdate('lifts', 'd8690f0f-0211-4534-ac11-db71736e5696', updatedLifts.Item);

			ResponseBuilder.ok<LiftAddedResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback, err.message);
		}
	}

	private _getLift({ liftId }: LiftObject): GetResultPromise {
		const params: GetItemInput = {
			TableName: LIFT_TABLE,
			Key: {
				liftId
			}
		};

		console.log(this.dynamo.get(params).promise());

		return this.dynamo.get(params).promise();
	}

	private _addLift(lift: LiftObject): PutResult {

		// lift.times.createdAt = Date.now().toString();
		const params: PutItemInput = {
			TableName: LIFT_TABLE,
			Item: lift
		};
		return this.dynamo.put(params).promise();
	}
}
