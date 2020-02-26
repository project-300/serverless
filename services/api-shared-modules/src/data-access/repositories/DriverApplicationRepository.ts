import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { equals } from '@aws/dynamodb-expressions';
import { Repository } from './Repository';
import { DriverApplicationObject, Vehicle } from '@project-300/common-types';
import { DriverApplicationItem } from '../../models';
import { QueryKey } from '../interfaces';

export class DriverApplicationRepository extends Repository {
	// REMEMBER ABOUT ProjectionExpression to take out pk, sk and entity!!!!

	public async getAll(approved: string): Promise<DriverApplicationObject[]> {
		const keyCondition: QueryKey = {
			entity: 'driverApplication'
		};
		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index',
			filter: {
				...equals(approved),
				subject: 'confirmed'
			}
		};
		const queryIterator: QueryIterator<DriverApplicationItem> = this.db.query(DriverApplicationItem, keyCondition, queryOptions);
		const applications: DriverApplicationItem[] = [];
		for await (const application of queryIterator) {
			applications.push(application);
		}
		return applications;
	}

	public async getByUserId(userId: string): Promise<DriverApplicationObject | undefined> {
		try {
			const item: DriverApplicationObject = await this.db.get(Object.assign(new DriverApplicationItem(), {
				pk: `user#${userId}`,
				sk:  `application#${userId}`
			}));
			return item;
		} catch (err) {
			return undefined;
		}
	}

	public async create(userId: string, toCreate: Vehicle): Promise<DriverApplicationObject> {
		return this.db.put(Object.assign(new DriverApplicationItem(), {
			entity: 'driverApplication',
			userId,
			pk: `user#${userId}`,
			sk: `application#${userId}`,
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
