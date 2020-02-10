import { Subscription, SubscriptionConnection } from '@project-300/common-types';
import { UnitOfWork } from '../../../api-shared-modules/src';

export interface SubscriptionData {
	subscriptionName: string; // driver-applications, user/profile, etc
	itemType: string; // journey, user, application, subscription, etc
	itemId: string; // hash id
	connectionId: string; // websocket connection id
	userId?: string; // user hash id
}

export default class SubscriptionManager {

	public constructor(private unitOfWork: UnitOfWork) { }

	public subscribe = async (subscriptionData: SubscriptionData): Promise<void> => {
		const currentSub: Subscription = await this._checkForExistingSubscription(subscriptionData);

		if (currentSub) {
			const connectionExists: boolean = await this._checkForExistingConnection(currentSub, subscriptionData.connectionId);

			if (connectionExists) return;

			await this._addSubConnection(currentSub, subscriptionData);
		} else {
			await this._saveSubscription(subscriptionData);
		}
	}

	public unsubscribe = async (subscriptionData: SubscriptionData): Promise<void> => {
		await this._deleteConnection(subscriptionData);
	}

	private _checkForExistingSubscription = async (subData: SubscriptionData): Promise<Subscription> => {
		const sub: Subscription = await this.unitOfWork.Subscriptions.getById(
			subData.subscriptionName,
			subData.itemType,
			subData.itemId
		);
		return sub;
	}

	private _checkForExistingConnection = async (currentSub: Subscription, connectionId: string): Promise<boolean> =>
		!!currentSub.connections.find((con: SubscriptionConnection) => con.connectionId === connectionId)

	private _saveSubscription = async (subscriptionData: SubscriptionData): Promise<void> => {
		await this.unitOfWork.Subscriptions.create(
			{
				connections: [
					this._createSubscriptionConnection(subscriptionData)
				]
			},
			subscriptionData.subscriptionName,
			subscriptionData.itemType,
			subscriptionData.itemId
		);
	}

	private _addSubConnection = async (subscription: Subscription, subscriptionData: SubscriptionData): Promise<void> => {
		subscription.connections.push(this._createSubscriptionConnection(subscriptionData));

		await this.unitOfWork.Subscriptions.update(
			subscriptionData.subscriptionName,
			subscriptionData.itemType,
			subscriptionData.itemId,
			subscription
		);
	}

	private _createSubscriptionConnection = (subscriptionData: SubscriptionData): SubscriptionConnection => {
		const subCon: SubscriptionConnection = {
			connectionId: subscriptionData.connectionId,
			times: {
				subscribedAt: new Date().toISOString()
			}
		};

		if (subscriptionData.userId) subCon.userId = subscriptionData.userId;

		return subCon;
	}

	private _deleteConnection = async (subscriptionData: SubscriptionData): Promise<void> => {
		const subscription: Subscription = await this.unitOfWork.Subscriptions.getById(
			subscriptionData.subscriptionName,
			subscriptionData.itemType,
			subscriptionData.itemId
		);

		if (!subscription) return;

		const index: number = this._getConnectionIndex(subscription, subscriptionData.connectionId);
		if (index === undefined || index < 0) return;

		subscription.connections.splice(index, 1);

		await this.unitOfWork.Subscriptions.update(
			subscriptionData.subscriptionName,
			subscriptionData.itemType,
			subscriptionData.itemId,
			subscription
		);
	}

	private _getConnectionIndex = (subscription: Subscription, connectionId: string): number =>
		subscription.connections &&
		subscription.connections.map(
			(con: SubscriptionConnection) => con.connectionId
		).indexOf(connectionId)

}
