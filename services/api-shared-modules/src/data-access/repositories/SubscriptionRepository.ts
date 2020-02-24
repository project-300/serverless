import { Subscription } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { Repository } from './Repository';
import { QueryKey, ISubscriptionRepository } from '../interfaces';
import { SubscriptionItem } from '../../models/core';
import { beginsWith, BeginsWithPredicate, ConditionExpression } from '@aws/dynamodb-expressions';

export class SubscriptionRepository extends Repository implements ISubscriptionRepository {

	public async getAll(): Promise<Subscription[]> {
		const keyCondition: QueryKey = {
			entity: 'subscription'
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index'
		};

		const queryIterator: QueryIterator<SubscriptionItem> = this.db.query(SubscriptionItem, keyCondition, queryOptions);
		const subscriptions: Subscription[] = [];

		for await (const sub of queryIterator) subscriptions.push(sub);

		return subscriptions;
	}

	public async getAllByType(subscriptionId: string, itemType: string, itemId: string): Promise<Subscription[]> {
		const predicate: BeginsWithPredicate = beginsWith(`subscription#${subscriptionId}`);

		const equalsExpression: ConditionExpression = {
			...predicate,
			subject: 'pk'
		};

		const keyCondition: QueryKey = {
			entity: 'subscription',
			sk: `${itemType}#${itemId}`
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index',
			filter: equalsExpression
		};

		const queryIterator: QueryIterator<SubscriptionItem> = this.db.query(SubscriptionItem, keyCondition, queryOptions);
		const subscriptions: Subscription[] = [];

		for await (const sub of queryIterator) subscriptions.push(sub);

		return subscriptions;
	}

	public async getAllByUser(userId: string): Promise<Subscription[]> {
		const keyCondition: QueryKey = {
			entity: 'subscription',
			sk3: `user#${userId}`
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk3-index'
		};

		const queryIterator: QueryIterator<SubscriptionItem> = this.db.query(SubscriptionItem, keyCondition, queryOptions);
		const subscriptions: Subscription[] = [];

		for await (const sub of queryIterator) subscriptions.push(sub);

		return subscriptions;
	}

	public async getAllByDeviceConnection(connectionId: string, deviceId: string): Promise<Subscription[]> {
		const keyCondition: QueryKey = {
			entity: 'subscription',
			sk2: `device#${deviceId}/connection#${connectionId}`
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk2-index'
		};

		const queryIterator: QueryIterator<SubscriptionItem> = this.db.query(SubscriptionItem, keyCondition, queryOptions);
		const subscriptions: Subscription[] = [];

		for await (const sub of queryIterator) subscriptions.push(sub);

		return subscriptions;
	}

	public async getAllByConnection(connectionId: string): Promise<Subscription[]> {
		const keyCondition: QueryKey = {
			entity: 'subscription',
			sk2: `/connection#${connectionId}`
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk2-index'
		};

		const queryIterator: QueryIterator<SubscriptionItem> = this.db.query(SubscriptionItem, keyCondition, queryOptions);
		const subscriptions: Subscription[] = [];

		for await (const sub of queryIterator) subscriptions.push(sub);

		return subscriptions;
	}

	public async getAllByDevice(deviceId: string): Promise<Subscription[]> {
		const keyCondition: QueryKey = {
			entity: 'subscription',
			sk2: beginsWith(`device#${deviceId}`)
		};

		console.log(keyCondition);

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk2-index'
		};

		const queryIterator: QueryIterator<SubscriptionItem> = this.db.query(SubscriptionItem, keyCondition, queryOptions);
		const subscriptions: Subscription[] = [];

		for await (const sub of queryIterator) subscriptions.push(sub);

		return subscriptions;
	}

	// public async getAllByName(subscriptions: string[]): Promise<Subscription[]> {
	// 	const keyCondition: QueryKey = {
	// 		entity: 'subscription'
	// 	};
	//
	// 	const queryOptions: QueryOptions = {
	// 		indexName: 'entity-sk-index',
	// 		filter: equalsExpression
	// 	};
	//
	// 	const queryIterator: QueryIterator<SubscriptionItem> = this.db.query(SubscriptionItem, keyCondition, queryOptions);
	// 	const subscriptions: Subscription[] = [];
	//
	// 	for await (const sub of queryIterator) subscriptions.push(sub);
	//
	// 	return subscriptions;
	// }

	public async getById(subscriptionId: string, itemType: string, itemId: string, connectionId: string): Promise<Subscription> {
		try {
			return await this.db.get(Object.assign(new SubscriptionItem(), {
				pk: `subscription#${subscriptionId}/connection#${connectionId}`,
				sk: `${itemType}#${itemId}`
			}));
		} catch (err) {
			return undefined;
		}
	}

	// public async getConnections(subscriptionId: string, itemType: string, itemId: string): Promise<SubscriptionConnection[]> {
	// 	const sub: Subscription = await this.db.get(Object.assign(new SubscriptionItem(), {
	// 		pk: `subscription#${subscriptionId}`,
	// 		sk: `${itemType}#${itemId}`
	// 	}), {
	// 		projection: [ 'connections' ]
	// 	});
	//
	// 	return sub.connections;
	// }

	public async create(subscriptionId: string, itemType: string,
		itemId: string, connectionId: string, deviceId: string, userId?: string): Promise<Subscription> {
		return this.db.put(Object.assign(new SubscriptionItem(), {
			entity: 'subscription',
			pk: `subscription#${subscriptionId}/connection#${connectionId}`,
			sk: `${itemType}#${itemId}`,
			sk2: deviceId ? `device#${deviceId}/connection#${connectionId}` : `connection#${connectionId}`,
			sk3: userId ? `user#${userId}` : undefined,
			connectionId,
			deviceId,
			subscriptionId,
			itemType,
			itemId,
			times: {
				subscribedAt: new Date().toISOString()
			}
		}));
	}

	public async update(subscriptionId: string, itemType: string, itemId: string, connectionId: string, changes: Partial<Subscription>):
		Promise<Subscription> {
		return this.db.update(Object.assign(new SubscriptionItem(), {
			pk: `subscription#${subscriptionId}/connection#${connectionId}`,
			sk: `${itemType}#${itemId}`,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(subscriptionId: string, itemType: string, itemId: string, connectionId: string): Promise<Subscription | undefined> {
		console.log('Delete: ', connectionId);
		try {
			const sub: SubscriptionItem = await this.db.delete(Object.assign(new SubscriptionItem(), {
				pk: `subscription#${subscriptionId}/connection#${connectionId}`,
				sk: `${itemType}#${itemId}`
			}), {
				returnValues: 'NONE'
			});

			return sub;
		} catch (err) {
			return undefined;
		}
	}
}
