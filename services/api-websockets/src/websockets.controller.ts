import { ApiEvent, ApiHandler, ApiResponse, ResponseBuilder, UnitOfWork, WsPostResult } from '../../api-shared-modules/src';
import { DefaultResult } from './interfaces';
import { PublishType, SubscriptionConnection } from '@project-300/common-types';
import SubscriptionManager from './pubsub/subscription';
import API from './lib/api';
import PublicationManager from './pubsub/publication';

export class ConnectController {

	public constructor(
		private unitOfWork: UnitOfWork,
		private subManager: SubscriptionManager,
		private pubManager: PublicationManager,
		private api: API
	) { }

	public connect: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		try {
			const subscriptionName: string = '$connect';
			const itemType: string = 'connection';
			const itemId: string = '$connect';
			const connectionId: string = event.requestContext.connectionId;

			await this.subManager.subscribe({
				subscriptionName,
				itemType,
				itemId,
				connectionId
			});

			if (process.env.ENVIRONMENT === 'dev') {
				await this.pubManager.publishCRUD({
					subscriptionName,
					itemType,
					itemId,
					publishType: PublishType.UPDATE,
					sendAsCollection: false,
					data: `${connectionId} has just connected`
				});
			}

			return ResponseBuilder.ok({ });
		} catch (err) {
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
		const subscriptionName: string = '$connect';
		const itemType: string = 'connection';
		const itemId: string = '$connect';
		const connectionId: string = event.requestContext.connectionId;

		try {
			await this.subManager.unsubscribe({
				subscriptionName,
				itemType,
				itemId,
				connectionId
			});

			if (process.env.ENVIRONMENT === 'dev') {
				const connections: SubscriptionConnection[] = await this.unitOfWork.Subscriptions.getConnections(subscriptionName, itemType, itemId);
				await this._alertUsers(connections, connectionId, 'left');
			}

			return ResponseBuilder.ok({ });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

		// This command is run as a cron job at regular intervals to clean up stale connection ids
	public cleanupConnections: ApiHandler = (event: ApiEvent): void => {
		// To be implemented
		// const subscriptions: Subscription[] = await this.unitOfWork.Subscriptions.getAll();
	}

		// For development / testing purposes only
	private _alertUsers = async (connections: SubscriptionConnection[], newConnection: string, action: string): Promise<void> => {
		await Promise.all(connections.map(async (con: SubscriptionConnection) => {
			await this.api.post({
				subscriptionName: '$connect',
				itemType: 'connection',
				itemId: '$connect',
				connectionId: con.connectionId
			}, {
				subscription: '$connect',
				notice: `${newConnection} has ${action}`
			});
		}));
	}

}
