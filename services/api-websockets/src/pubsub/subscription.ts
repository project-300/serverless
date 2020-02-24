import { Subscription } from '@project-300/common-types';
import { UnitOfWork } from '../../../api-shared-modules/src';

export interface SubscriptionData {
	subscriptionName: string; // driver-applications, user/profile, etc
	itemType: string; // journey, user, application, subscription, etc
	itemId: string; // hash id
	connectionId: string; // websocket connection id
	deviceId?: string;
	userId?: string; // user hash id
}

export default class SubscriptionManager {

	public constructor(private unitOfWork: UnitOfWork) { }

	public subscribe = async (subscriptionData: SubscriptionData): Promise<void> => {
		const currentSub: Subscription = await this._checkForExistingSubscription(subscriptionData);

		if (currentSub && currentSub.deviceId === subscriptionData.deviceId) {
			const { subscriptionName, itemType, itemId, connectionId }: SubscriptionData = subscriptionData;
			await this.unitOfWork.Subscriptions.delete(subscriptionName, itemType, itemId, connectionId);
			await this._saveSubscription(subscriptionData);
		}

		if (!currentSub) await this._saveSubscription(subscriptionData);
	}

	public unsubscribe = async (subscriptionData: SubscriptionData): Promise<void> => {
		await this._deleteConnection(subscriptionData);
	}

	public unsubscribeAll = async (connectionId: string): Promise<void> => {
		const connectionSub: Subscription = await this.unitOfWork.Subscriptions.getById(
			'$connect',
			'connection',
			'$connect',
			connectionId
		);

		if (!connectionSub || !connectionSub.userId) return;

		const subs: Subscription[] = await this.unitOfWork.Subscriptions.getAllByUser(connectionSub.userId);

		await Promise.all(subs.map(async (sub: Subscription) => {
			await this._deleteConnection({
				subscriptionName: sub.subscriptionId,
				itemType: sub.itemType,
				itemId: sub.itemId,
				connectionId: sub.connectionId
			});
		}));
	}

	private _checkForExistingSubscription = async (subData: SubscriptionData): Promise<Subscription> =>
		this.unitOfWork.Subscriptions.getById(
			subData.subscriptionName,
			subData.itemType,
			subData.itemId,
			subData.connectionId
		)

	private _saveSubscription = async (subscriptionData: SubscriptionData): Promise<void> => {
		await this.unitOfWork.Subscriptions.create(
			subscriptionData.subscriptionName,
			subscriptionData.itemType,
			subscriptionData.itemId,
			subscriptionData.connectionId,
			subscriptionData.deviceId,
			subscriptionData.userId
		);
	}

	private _deleteConnection = async (subscriptionData: SubscriptionData): Promise<void> => {
		await this.unitOfWork.Subscriptions.delete(
			subscriptionData.subscriptionName,
			subscriptionData.itemType,
			subscriptionData.itemId,
			subscriptionData.connectionId
		);
	}

}
