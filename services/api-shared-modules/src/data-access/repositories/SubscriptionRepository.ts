import { Subscription, SubscriptionConnection } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { Repository } from './Repository';
import { QueryKey, ISubscriptionRepository } from '../interfaces';
import { SubscriptionItem } from '../../models/core/Subscription';
import { ConditionExpression, EqualityExpressionPredicate, equals } from '@aws/dynamodb-expressions';

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

	public async getAllByType(subscriptionId: string): Promise<Subscription[]> {
		const equalsExpressionPredicate: EqualityExpressionPredicate = equals(`subscription#${subscriptionId}`);

		const equalsExpression: ConditionExpression = {
			...equalsExpressionPredicate,
			subject: 'pk'
		};

		const keyCondition: QueryKey = {
			entity: 'subscription'
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

	public async getById(subscriptionId: string, itemType: string, itemId: string): Promise<Subscription> {
		return this.db.get(Object.assign(new SubscriptionItem(), {
			pk: `subscription#${subscriptionId}`,
			sk: `${itemType}#${itemId}`
		}));
	}

	public async getConnections(subscriptionId: string, itemType: string, itemId: string): Promise<SubscriptionConnection[]> {
		const sub: Subscription = await this.db.get(Object.assign(new SubscriptionItem(), {
			pk: `subscription#${subscriptionId}`,
			sk: `${itemType}#${itemId}`
		}), {
			projection: [ 'connections' ]
		});

		return sub.connections;
	}

	public async create(toCreate: Partial<Subscription>, subscriptionType: string, itemType: string, itemId: string): Promise<Subscription> {
		return this.db.put(Object.assign(new SubscriptionItem(), {
			entity: 'subscription',
			pk: `subscription#${subscriptionType}`,
			sk: `${itemType}#${itemId}`,
			...toCreate
		}));
	}

	public async update(subscriptionId: string, itemType: string, itemId: string, changes: Partial<Subscription>): Promise<Subscription> {
		return this.db.update(Object.assign(new SubscriptionItem(), {
			pk: `subscription#${subscriptionId}`,
			sk: `${itemType}#${itemId}`,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(subscriptionId: string, itemType: string, itemId: string): Promise<Subscription | undefined> {
		return this.db.delete(Object.assign(new SubscriptionItem(), {
			pk: `subscription#${subscriptionId}`,
			sk: `${itemType}#${itemId}`
		}), {
			returnValues: 'ALL_OLD'
		});
	}
}
