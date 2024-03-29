import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { equals } from '@aws/dynamodb-expressions';
import { Repository } from './Repository';
import { DriverApplicationObject } from '@project-300/common-types';
import { DriverApplicationItem } from '../../models';
import { QueryKey } from '../interfaces';

export class DriverApplicationRepository extends Repository {
	// REMEMBER ABOUT ProjectionExpression to take out pk, sk and entity!!!!

	public async getAll(approved: boolean, universityId: string): Promise<DriverApplicationObject[]> {
		const keyCondition: QueryKey = {
			entity: 'driverApplication',
			sk2: `university#${universityId}`
		};
		const queryOptions: QueryOptions = {
			indexName: 'entity-sk2-index',
			filter: {
				...equals(approved),
				subject: 'approved'
			}
		};
		console.log(keyCondition);
		console.log(queryOptions);
		const queryIterator: QueryIterator<DriverApplicationItem> = this.db.query(DriverApplicationItem, keyCondition, queryOptions);
		const applications: DriverApplicationItem[] = [];
		for await (const application of queryIterator) {
			applications.push(application);
		}

		console.log(applications);
		return applications;
	}

	public async getByUserId(userId: string): Promise<DriverApplicationObject | undefined> {
		try {
			const item: DriverApplicationObject = await this.db.get(Object.assign(new DriverApplicationItem(), {
				pk: `user#${userId}`,
				sk: `application#${userId}`
			}));
			return item;
		} catch (err) {
			return undefined;
		}
	}

	public async create(userId: string, universityId: string, toCreate: Partial<DriverApplicationObject>): Promise<DriverApplicationObject> {
		return this.db.put(Object.assign(new DriverApplicationItem(), {
			entity: 'driverApplication',
			pk: `user#${userId}`,
			sk: `application#${userId}`,
			sk2: `university#${universityId}`,
			times: {
				applied: new Date().toISOString()
			},
			approved: false,
			...toCreate
		}));
	}

	public async update(userId: string, changes: Partial<DriverApplicationObject>): Promise<DriverApplicationObject> {
		return this.db.update(Object.assign(new DriverApplicationItem(), {
			pk: `user#${userId}`,
			sk: `application#${userId}`,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(userId: string): Promise<DriverApplicationObject> {
		return this.db.delete(Object.assign(new DriverApplicationItem(), {
			pk: `user#${userId}`,
			sk: `application#${userId}`
		}), {
			returnValues: 'ALL_OLD'
		});
	}
}
