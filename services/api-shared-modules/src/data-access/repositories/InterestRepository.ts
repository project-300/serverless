import { Interest } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { QueryKey, IInterestRepository } from '../interfaces';
import { InterestItem } from '../../models/core/Interest';

export class InterestRepository extends Repository implements IInterestRepository {

	public async getAll(): Promise<Interest[]> {
		const keyCondition: QueryKey = {
			entity: 'interest'
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index'
		};

		const queryIterator: QueryIterator<InterestItem> = this.db.query(InterestItem, keyCondition, queryOptions);
		const interests: Interest[] = [];

		for await (const interest of queryIterator) interests.push(interest);

		return interests;
	}

	public async getById(interestId: string): Promise<Interest> {
		return this.db.get(Object.assign(new InterestItem(), {
			pk: `interest#${interestId}`,
			sk: `interest#${interestId}`
		}));
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
			sk: `interest#${id}`,
			...toCreate
		}));
	}

	public async update(interestId: string, changes: Partial<Interest>): Promise<Interest> {
		return this.db.update(Object.assign(new InterestItem(), {
			pk: `interest#${interestId}`,
			sk: `interest#${interestId}`,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(interestId: string): Promise<Interest | undefined> {
		return this.db.delete(Object.assign(new InterestItem(), {
			pk: `interest#${interestId}`,
			sk: `interest#${interestId}`
		}), {
			returnValues: 'ALL_OLD'
		});
	}

}
