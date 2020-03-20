import { University } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { QueryKey, IUniversityRepository } from '../interfaces';
import { UniversityItem } from '../../models/core';
// import {
// 	AttributePath,
// 	ConditionExpression, EqualityExpressionPredicate, equals,
// 	InequalityExpressionPredicate,
// 	lessThan,
// 	LessThanExpressionPredicate,
// 	notEquals
// } from '@aws/dynamodb-expressions';

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

		for await (const university of queryIterator) universities.push(university);

		return universities;
	}

	public async getById(universityId: string, name: string): Promise<University> {
		const uniName: string = this._fillUniversityName(name);

		try {
			return await this.db.get(Object.assign(new UniversityItem(), {
				pk: `university#${universityId}`,
				sk: `universityName#${uniName}`
			}));
		} catch (err) {
			return undefined;
		}
	}

	public async getByIdOnly(universityId: string): Promise<University> {
		const keyCondition: QueryKey = {
			pk: `university#${universityId}`
		};

		const queryOptions: QueryOptions = { };

		const queryIterator: QueryIterator<UniversityItem> = this.db.query(UniversityItem, keyCondition, queryOptions);
		const universities: University[] = [];

		for await (const university of queryIterator) universities.push(university);

		return universities[0];
	}

	public async getByName(name: string): Promise<University> {
		const uniName: string = this._fillUniversityName(name);

		const keyCondition: QueryKey = {
			entity: 'university',
			sk: `universityName#${uniName}`
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index'
		};

		const queryIterator: QueryIterator<UniversityItem> = this.db.query(UniversityItem, keyCondition, queryOptions);
		const universities: University[] = [];

		for await (const university of queryIterator) universities.push(university);

		return universities[0];

	}

	public async getAllDomains(): Promise<string[]> {
		const keyCondition: QueryKey = {
			entity: 'university'
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index',
			projection: [ 'emailDomains' ]
		};

		const queryIterator: QueryIterator<UniversityItem> = this.db.query(UniversityItem, keyCondition, queryOptions);
		const domains: string[] = [];

		for await (const university of queryIterator) domains.push(...university.emailDomains);

		return domains;
	}

	public async create(toCreate: Partial<University>): Promise<University> {
		const id: string = uuid();
		const uniName: string = this._fillUniversityName(toCreate.name);

		return this.db.put(Object.assign(new UniversityItem(), {
			entity: 'university',
			times: {
				createdAt: new Date().toISOString()
			},
			universityId: id,
			pk: `university#${id}`,
			sk: `universityName#${uniName}`,
			...toCreate
		}));
	}

	public async update(universityId: string, name: string, changes: Partial<University>): Promise<University> {
		const uniName: string = this._fillUniversityName(name);

		return this.db.update(Object.assign(new UniversityItem(), {
			pk: `university#${universityId}`,
			sk: `universityName#${uniName}`,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(universityId: string, name: string): Promise<University | undefined> {
		const uniName: string = this._fillUniversityName(name);

		return this.db.delete(Object.assign(new UniversityItem(), {
			pk: `university#${universityId}`,
			sk: `universityName#${uniName}`
		}), {
			returnValues: 'ALL_OLD'
		});
	}

	private _fillUniversityName = (name: string): string => name.replace(' ', '-').toLowerCase();

}
