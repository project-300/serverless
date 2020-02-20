import { Journey } from '@project-300/common-types';
import { QueryOptions, QueryIterator, QueryPaginator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { IJourneyRepository, QueryKey } from '../interfaces';
import { JourneyItem } from '../../models/core';
import {
	ConditionExpression,
	contains,
	greaterThan,
	ContainsPredicate,
	inList,
	MembershipExpressionPredicate,
	equals,
	EqualityExpressionPredicate
} from '@aws/dynamodb-expressions';
import { SharedFunctions } from '../..';

export class JourneyRepository extends Repository implements IJourneyRepository {

	public async getAll(lastEvaluatedKey?: Partial<JourneyItem>): Promise<{ journeys: Journey[]; lastEvaluatedKey: Partial<JourneyItem>}> {
		const predicate: EqualityExpressionPredicate = equals(true);

		const equalsExpression: ConditionExpression = {
			...predicate,
			subject: 'available'
		};

		const keyCondition: QueryKey = {
			entity: 'journey',
			sk3: greaterThan(`leavingAt#${new Date().toISOString()}`)
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk3-index',
			scanIndexForward: true,
			startKey: lastEvaluatedKey,
			filter: equalsExpression,
			limit: 10
		};

		const queryPages: QueryPaginator<JourneyItem> = this.db.query(JourneyItem, keyCondition, queryOptions).pages();
		const journeys: Journey[] = [];

		for await (const page of queryPages) {
			for (const journey of page) journeys.push(journey);
		}

		return {
			journeys,
			lastEvaluatedKey:
				queryPages.lastEvaluatedKey ?
					SharedFunctions.stripLastEvaluatedKey(queryPages.lastEvaluatedKey) :
					undefined
		};
	}

	public async getUserJourneys(userId: string): Promise<Journey[]> {
		const keyCondition: QueryKey = {
			entity: 'journey',
			sk2: `user#${userId}`
		};

		const queryOptions: QueryOptions = {
			indexName: 'created-by-index',
			scanIndexForward: false
		};

		const queryIterator: QueryIterator<JourneyItem> = this.db.query(JourneyItem, keyCondition, queryOptions);
		const journeys: Journey[] = [];

		for await (const journey of queryIterator) journeys.push(journey);

		return journeys;
	}

	public async searchJourneys(query: string, lastEvaluatedKey?: Partial<JourneyItem>)
		: Promise<{ journeys: Journey[]; lastEvaluatedKey: Partial<JourneyItem>}> {
		const equalsExpressionPredicate: ContainsPredicate = contains(query.toLowerCase());

		const equalsExpression: ConditionExpression = {
			...equalsExpressionPredicate,
			subject: 'searchText'
		};

		const keyCondition: QueryKey = {
			entity: 'journey'
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index',
			scanIndexForward: false,
			filter: equalsExpression,
			startKey: lastEvaluatedKey,
			limit: 10
		};

		const queryPages: QueryPaginator<JourneyItem> = this.db.query(JourneyItem, keyCondition, queryOptions).pages();
		const journeys: Journey[] = [];

		for await (const page of queryPages) {
			for (const journey of page) journeys.push(journey);
		}

		return { journeys, lastEvaluatedKey: SharedFunctions.stripLastEvaluatedKey(queryPages.lastEvaluatedKey) };
	}

	public async getJourneysWithIds(journeyIds: string[]): Promise<Journey[]> {
		const ids: string[] = journeyIds.map((jid: string) => `journey#${jid}`);
		const equalsExpressionPredicate: MembershipExpressionPredicate = inList(...ids);

		const equalsExpression: ConditionExpression = {
			...equalsExpressionPredicate,
			subject: 'pk'
		};

		const keyCondition: QueryKey = {
			entity: 'journey'
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index',
			filter: equalsExpression,
			scanIndexForward: false
		};

		const queryIterator: QueryIterator<JourneyItem> = this.db.query(JourneyItem, keyCondition, queryOptions);
		const journeys: Journey[] = [];

		for await (const journey of queryIterator) journeys.push(journey);

		return journeys;
	}

	public async getById(journeyId: string, createdAt: string): Promise<Journey> {
		return this.db.get(Object.assign(new JourneyItem(), {
			pk: `journey#${journeyId}`,
			sk: `createdAt#${createdAt}`
		}));
	}

	public async getByIdWithProjection(journeyId: string, createdAt: string, projection?: string[]): Promise<Journey> {
		return this.db.get(Object.assign(new JourneyItem(), {
			pk: `journey#${journeyId}`,
			sk: `createdAt#${createdAt}`
		}), {
			projection
		});
	}

	public async create(toCreate: Partial<Journey>): Promise<Journey> {
		const id: string = uuid();

		return this.db.put(Object.assign(new JourneyItem(), {
			entity: 'journey',
			journeyId: id,
			pk: `journey#${id}`,
			sk: `createdAt#${toCreate.times.createdAt}`,
			sk2: `user#${toCreate.driver.userId}`,
			sk3: `leavingAt#${toCreate.times.leavingAt}`,
			passengers: [],
			journeyStatus: 'NOT_STARTED',
			routeTravelled: [],
			seatsLeft: toCreate.totalNoOfSeats,
			lastLocation: { latitude: 0, longitude: 0 },
			available: true,
			...toCreate
		}));
	}

	public async update(journeyId: string, createdAt: string, changes: Partial<Journey>): Promise<Journey> {
		return this.db.update(Object.assign(new JourneyItem(), {
			pk: `journey#${journeyId}`,
			sk: `createdAt#${createdAt}`,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(journeyId: string, createdAt: string): Promise<Journey | undefined> {
		return this.db.delete(Object.assign(new JourneyItem(), {
			pk: `journey#${journeyId}`,
			sk: `createdAt#${createdAt}`
		}), {
			returnValues: 'ALL_OLD'
		});
	}

}
