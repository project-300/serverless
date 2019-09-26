import { HTTPRequest, SubscriptionRequest } from '@project-300/common-types';
import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { USERS_INDEX } from '../../constants/indexes';
import { USER_TABLE } from '../../constants/tables';
import PubManager from '../../pubsub/publication';
import SubManager from '../../pubsub/subscription';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.types';
import { GetResult, GetResultPromise, UpdateResult } from '../../responses/dynamodb.types';
import { ResponseBuilder } from '../../responses/response-builder';
import { GetUserSuccessResult, UpdateAvatarSuccessResult, UpdateEmailSuccessResult } from './user.interfaces';
import GetItemInput = DocumentClient.GetItemInput;
import UpdateItemInput = DocumentClient.UpdateItemInput;
import * as EmailValidator from 'email-validator';

export class UserController {

	/*
		This controller temporarily publishes updates to user/profile subscription
		Every user who is subscribed will receive other user updates
		This will be changed with the new updates to the Websocket pub/sub system
	*/

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

	public updateEmail: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback) => {
		const result: UpdateEmailSuccessResult = {
			success: true
		};

		const body: HTTPRequest = JSON.parse(event.body);
		const { userId, email }: HTTPRequest = body;

		if (!EmailValidator.validate(email))
			return ResponseBuilder.internalServerError(Error('Invalid Email'), callback, 'Unable to update email address');

		try {
			await this._updateEmail(userId, email);
			const res: GetResult = await this._getUser(userId);
			await PubManager.publishUpdate('user/profile', 'userId', res.Item);

			ResponseBuilder.ok<UpdateEmailSuccessResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback, 'Unable to update email address');
		}
	}

	private _updateEmail = (userId: string, email: string): UpdateResult => {
		const params: UpdateItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			},
			UpdateExpression: 'set email = :email',
			ExpressionAttributeValues: {
				':email': email
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

	public updateAvatar: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback) => {
		const result: UpdateAvatarSuccessResult = {
			success: true
		};

		const body: HTTPRequest = JSON.parse(event.body);
		const { userId, avatarURL }: HTTPRequest = body;

		try {
			await this._updateAvatar(userId, avatarURL);
			const res: GetResult = await this._getUser(userId);
			await PubManager.publishUpdate('user/profile', 'userId', res.Item);

			ResponseBuilder.ok<UpdateAvatarSuccessResult>(result, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback, 'Unable to update avatar');
		}
	}

	private _updateAvatar = (userId: string, avatarURL: string): UpdateResult => {
		const params: UpdateItemInput = {
			TableName: USER_TABLE,
			Key: {
				[USERS_INDEX]: userId
			},
			UpdateExpression: 'set avatar = :url',
			ExpressionAttributeValues: {
				':url': avatarURL
			},
			ReturnValues: 'UPDATED_NEW'
		};

		return this.dynamo.update(params).promise();
	}

}
