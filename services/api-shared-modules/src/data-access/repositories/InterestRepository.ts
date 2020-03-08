import { Interest } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { QueryKey, IInterestRepository } from '../interfaces';
import { InterestItem } from '../../models/core/Interest';
import { ConditionExpression, EqualityExpressionPredicate, equals } from '@aws/dynamodb-expressions';

export class InterestRepository extends Repository implements IInterestRepository {

	public async getAll(universityId: string): Promise<Interest[]> {
		const keyCondition: QueryKey = {
			entity: 'interest',
			sk: `university#${universityId}`
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index'
		};

		const queryIterator: QueryIterator<InterestItem> = this.db.query(InterestItem, keyCondition, queryOptions);
		const interests: Interest[] = [];

		for await (const interest of queryIterator) interests.push(interest);

		return interests;
	}

	public async getById(interestId: string, universityId: string): Promise<Interest> {
		try {
			return await this.db.get(Object.assign(new InterestItem(), {
				pk: `interest#${interestId}`,
				sk: `university#${universityId}`
			}));
		} catch (err) {
			return undefined;
		}
	}

	public async getByName(name: string, universityId: string): Promise<Interest | undefined> {
		const predicate: EqualityExpressionPredicate = equals(name);

		const expression: ConditionExpression = {
			...predicate,
			subject: 'name'
		};

		const keyCondition: QueryKey = {
			entity: 'interest',
			sk: `university#${universityId}`
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index',
			filter: expression
		};

		const queryIterator: QueryIterator<InterestItem> = this.db.query(InterestItem, keyCondition, queryOptions);
		const interests: Interest[] = [];

		for await (const interest of queryIterator) interests.push(interest);

		return interests[0];
	}

	public async create(toCreate: Partial<Interest>): Promise<Interest> {
		const id: string = uuid();

		return this.db.put(Object.assign(new InterestItem(), {
			entity: 'interest',
			times: {
				createdAt: new Date().toISOString()
			},
			interestId: id,
			pk: `interest#${id}`,
			sk: `university#${toCreate.universityId}`,
			...toCreate
		}));
	}

	public async update(interestId: string, universityId: string, changes: Partial<Interest>): Promise<Interest> {
		return this.db.update(Object.assign(new InterestItem(), {
			pk: `interest#${interestId}`,
			sk: `university#${universityId}`,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(interestId: string, universityId: string): Promise<Interest | undefined> {
		return this.db.delete(Object.assign(new InterestItem(), {
			pk: `interest#${interestId}`,
			sk: `university#${universityId}`
		}), {
			returnValues: 'ALL_OLD'
		});
	}

}
