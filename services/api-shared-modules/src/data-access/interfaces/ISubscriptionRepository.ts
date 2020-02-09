import { Subscription, SubscriptionConnection } from '@project-300/common-types';

export interface ISubscriptionRepository {
	getAll(): Promise<Subscription[]>;
	getAllByType(subscriptionId: string): Promise<Subscription[]>;
	getById(subscriptionId: string, itemType: string, itemId: string): Promise<Subscription>;
	getConnections(subscriptionId: string, itemType: string, itemId: string): Promise<SubscriptionConnection[]>;
	create(toCreate: Partial<Subscription>, subscriptionType: string, itemType: string, itemId: string): Promise<Subscription>;
	update(subscriptionId: string, itemType: string, itemId: string, changes: Partial<Subscription>): Promise<Subscription>;
	delete(subscriptionId: string, itemType: string, itemId: string): Promise<Subscription | undefined>;
}
