import { Journey } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { IJourneyRepository, QueryKey } from '../interfaces';
import { JourneyItem } from '../../models/core';
import { ConditionExpression, inList, MembershipExpressionPredicate } from '@aws/dynamodb-expressions';

export class JourneyRepository extends Repository implements IJourneyRepository {

	public async getAll(): Promise<Journey[]> {
		const keyCondition: QueryKey = {
			entity: 'journey'
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index'
		};

		const queryIterator: QueryIterator<JourneyItem> = this.db.query(JourneyItem, keyCondition, queryOptions);
		const journeys: Journey[] = [];

		for await (const journey of queryIterator) journeys.push(journey);

		return journeys;
	}

	public async getUserJourneys(userId: string): Promise<Journey[]> {
		const keyCondition: QueryKey = {
			entity: 'journey',
			createdBy: `user#${userId}`
		};

		const queryOptions: QueryOptions = {
			indexName: 'created-by-index'
		};

		const queryIterator: QueryIterator<JourneyItem> = this.db.query(JourneyItem, keyCondition, queryOptions);
		const journeys: Journey[] = [];

		for await (const journey of queryIterator) journeys.push(journey);

		return journeys;
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
			filter: equalsExpression
		};

		const queryIterator: QueryIterator<JourneyItem> = this.db.query(JourneyItem, keyCondition, queryOptions);
		const journeys: Journey[] = [];

		for await (const journey of queryIterator) journeys.push(journey);

		return journeys;
	}

	public async getById(journeyId: string): Promise<Journey> {
		return this.db.get(Object.assign(new JourneyItem(), {
			pk: `journey#${journeyId}`,
			sk: `journey#${journeyId}`
		}));
	}

	public async getByIdWithProjection(journeyId: string, projection?: string[]): Promise<Journey> {
		return this.db.get(Object.assign(new JourneyItem(), {
			pk: `journey#${journeyId}`,
			sk: `journey#${journeyId}`
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
			sk: `journey#${id}`,
			createdBy: `user#${toCreate.driver.userId}`,
			passengers: [],
			journeyStatus: 'NOT_STARTED',
			routeTravelled: [],
			seatsLeft: toCreate.totalNoOfSeats,
			lastLocation: { latitude: 0, longitude: 0 },
			...toCreate
		}));
	}

	public async update(journeyId: string, changes: Partial<Journey>): Promise<Journey> {
		return this.db.update(Object.assign(new JourneyItem(), {
			pk: `journey#${journeyId}`,
			sk: `journey#${journeyId}`,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(journeyId: string): Promise<Journey | undefined> {
		return this.db.delete(Object.assign(new JourneyItem(), {
			pk: `journey#${journeyId}`,
			sk: `journey#${journeyId}`
		}), {
			returnValues: 'ALL_OLD'
		});
	}

}
