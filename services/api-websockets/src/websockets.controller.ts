import { ApiEvent, ApiHandler, ApiResponse, ResponseBuilder, UnitOfWork } from '../../api-shared-modules/src';
import { PublishType, Subscription, User, UserConnection } from '@project-300/common-types';
import SubscriptionManager, { SubscriptionData } from './pubsub/subscription';
import API from './lib/api';
import PublicationManager from './pubsub/publication';
import * as moment from 'moment';
import _ from 'lodash';

const $connectSubData: SubscriptionData = {
	subscriptionName: '$connect',
	itemType: 'connection',
	itemId: '$connect',
	connectionId: ''
};

export class ConnectController {

	public constructor(
		private unitOfWork: UnitOfWork,
		private subManager: SubscriptionManager,
		private pubManager: PublicationManager,
		private api: API
	) { }

	public connect: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		try {
			const connectionId: string = event.requestContext.connectionId;

			await this.subManager.subscribe({
				...$connectSubData,
				connectionId
			});

			if (process.env.ENVIRONMENT === 'dev') {
				await this.pubManager.publishCRUD({
					subscriptionName: `${$connectSubData.subscriptionName}`,
					itemType: $connectSubData.itemType,
					itemId: $connectSubData.itemId,
					publishType: PublishType.UPDATE,
					sendAsCollection: false,
					data: `${connectionId} has just connected`
				});
			}

			return ResponseBuilder.ok({ });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err);
		}
	}

	public default: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		try {
			await this.pubManager.publishSingleNotification(event.requestContext.connectionId, 'No function specified');

			return ResponseBuilder.ok({ });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	public disconnect: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const connectionId: string = event.requestContext.connectionId;

		try {
			await this.subManager.unsubscribe({
				subscriptionName: $connectSubData.subscriptionName,
				itemType: $connectSubData.itemType,
				itemId: $connectSubData.itemId,
				connectionId
			});

			return ResponseBuilder.ok({ });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	public updateConnection: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const connectionId: string = event.requestContext.connectionId;
		const body: { userId: string; deviceId: string; oldConnection?: string } = JSON.parse(event.body);

		if (!body.userId) return;

		const userId: string = body.userId;
		const deviceId: string = body.deviceId;
		const oldConnection: string = body.oldConnection; 	// Previous connectionId from same device -
															// Only sent in case of disconnection for reconnection

		try {
			const user: User = await this.unitOfWork.Users.getById(userId);
			if (!user) return;

			const connectionData: UserConnection = {
				deviceId,
				connectionId,
				connectedAt: new Date().toISOString()
			};

			if (user.connections) {
				user.connections = _.reject(
					user.connections,
					(con: UserConnection) => con.deviceId === deviceId || moment().subtract(3, 'hours') > moment(con.connectedAt)
				);
				user.connections.push(connectionData); // Add new connectionId to user
			} else {
				user.connections = [ connectionData ];
			}

			if (oldConnection && oldConnection !== connectionId) {
				const conIndex: number = user.connections.findIndex((con: UserConnection) => con.connectionId === oldConnection);
				if (conIndex > -1) user.connections.splice(conIndex, 1); // Remove old connection from user
			}

			await this.unitOfWork.Users.update(userId, user);
			await this._updateUserSubscriptions(user.userId, connectionId, oldConnection, deviceId);

			const sub: Subscription = await this.unitOfWork.Subscriptions.getById(
				'$connect',
				'connection',
				'$connect',
				connectionId
			);

			if (sub) {
				delete sub.sk2;
				delete sub.sk3;
				sub.userId = userId;
				await this.unitOfWork.Subscriptions.update(
					'$connect',
					'connection',
					'$connect',
					connectionId,
					sub
				);
			} else {await this.unitOfWork.Subscriptions.create(
					'$connect',
					'connection',
					'$connect',
					connectionId,
					userId
				);
			}

			await this.api.post({ // Send message to client with new connectionId
				...$connectSubData,
				connectionId
			}, {
				subscription: 'connectionUpdated',
				connectionId,
				userId
			});

			return ResponseBuilder.ok({ });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _updateUserSubscriptions =
		async (userId: string, newConnectionId: string, oldConnection: string, deviceId: string): Promise<void> => {
		const userSubs: Subscription[] = await this.unitOfWork.Subscriptions.getAllByDevice(deviceId);

		await Promise.all(userSubs.map(async (sub: Subscription): Promise<void> => {
			if (oldConnection) await this.unitOfWork.Subscriptions.create(
				sub.subscriptionId,
				sub.itemType,
				sub.itemId,
				newConnectionId,
				deviceId,
				userId
			);
			await this.unitOfWork.Subscriptions.delete(sub.subscriptionId, sub.itemType, sub.itemId, sub.connectionId);
		}));
	}

		// This command is run as a cron job at regular intervals to clean up stale connection ids
	// public cleanupConnections: ApiHandler = (event: ApiEvent): void => {
	// 	console.log(event);
	// 	// To be implemented
	// 	// const subscriptions: Subscription[] = await this.unitOfWork.Subscriptions.getAll();
	// }

}
