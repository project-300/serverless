import { Subscription } from '@project-300/common-types';

export interface ISubscriptionRepository {
	getAll(): Promise<Subscription[]>;
	getAllByType(subscriptionId: string, itemType: string, itemId: string): Promise<Subscription[]>;
	getAllByUser(userId: string): Promise<Subscription[]>;
	getAllByDeviceConnection(connectionId: string, deviceId: string): Promise<Subscription[]>;
	getAllByConnection(connectionId: string): Promise<Subscription[]>;
	getAllByDevice(deviceId: string): Promise<Subscription[]>;
	getById(subscriptionId: string, itemType: string, itemId: string, connectionId: string): Promise<Subscription>;
	getByType(subscriptionId: string, connectionId: string, userId: string): Promise<Subscription[]>;
	create(subscriptionId: string, itemType: string, itemId: string, connectionId: string, deviceId: string, userId?: string):
		Promise<Subscription>;
	update(subscriptionId: string, itemType: string, itemId: string, connectionId: string, changes: Partial<Subscription>): Promise<Subscription>;
	delete(subscriptionId: string, itemType: string, itemId: string, connectionId: string): Promise<Subscription | undefined>;
}
