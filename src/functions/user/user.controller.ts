import { SubscriptionRequest } from '@project-300/common-types';
import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import SubManager from '../../pubsub/subscription';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.types';
import { GetResult, GetResultPromise } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { GetUserSuccessResult } from './user.interfaces';
import GetItemInput = DocumentClient.GetItemInput;

export class UserController {

	private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public getUser: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const result: GetUserSuccessResult = {
			success: true
		};

		const body: SubscriptionRequest = JSON.parse(event.body);

		try {
			if (body.subscribe) {
				const res: GetResult = await this._getUser(body.userId);
				await SubManager.subscribe(
					event,
					body.subscription,
					USERS_INDEX,
					res.Item,
					true
				);
			} else {
				await SubManager.unsubscribe(body.subscription, event.requestContext.connectionId);
			}

			ResponseBuilder.ok<GetUserSuccessResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback, 'Unable to subscribe to User Profile');
		}
	}

	private _getUser = (userId: string): GetResultPromise => {
		const params: GetItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			}
		};

		return this.dynamo.get(params).promise();
	}
}
