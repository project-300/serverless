import { University } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { QueryKey, IUniversityRepository } from '../interfaces';
import { UniversityItem } from '../../models/core/University';

export class UniversityRepository extends Repository implements IUniversityRepository {

	public async getAll(): Promise<University[]> {
		const keyCondition: QueryKey = {
			entity: 'university'
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index'
		};

		const queryIterator: QueryIterator<UniversityItem> = this.db.query(UniversityItem, keyCondition, queryOptions);
		const universities: University[] = [];

		for await (const journey of queryIterator) universities.push(journey);

		return universities;
	}

	public async getById(universityId: string): Promise<University> {
		return this.db.get(Object.assign(new UniversityItem(), {
			pk: `university#${universityId}`,
			sk: `university#${universityId}`
		}));
	}

	public async create(toCreate: Partial<University>): Promise<University> {
		const id: string = uuid();

		return this.db.put(Object.assign(new UniversityItem(), {
			entity: 'university',
			times: {
				createdAt: new Date().toISOString()
			},
			universityId: id,
			pk: `university#${id}`,
			sk: `university#${id}`,
			...toCreate
		}));
	}

	public async update(universityId: string, changes: Partial<University>): Promise<University> {
		return this.db.update(Object.assign(new UniversityItem(), {
			pk: `university#${universityId}`,
			sk: `university#${universityId}`,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(universityId: string): Promise<University | undefined> {
		return this.db.delete(Object.assign(new UniversityItem(), {
			pk: `university#${universityId}`,
			sk: `university#${universityId}`
		}), {
			returnValues: 'ALL_OLD'
		});
	}

}
