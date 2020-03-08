import { UserItem } from '../../models/core';
import { DriverBrief, User, UserBrief } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { QueryKey } from '../interfaces';

export class UserRepository extends Repository {

	public async getAll(): Promise<User[]> {
		const keyCondition: QueryKey = {
			entity: 'user'
		};
		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index'
		};
		const queryIterator: QueryIterator<UserItem> = this.db.query(UserItem, keyCondition, queryOptions);
		const users: User[] = [];
		for await (const user of queryIterator) {
			users.push(user);
		}
		return users;
	}

	public async getById(userId: string): Promise<User> {
		return this.db.get(Object.assign(new UserItem(), {
			pk: `user#${userId}`,
			sk: `user#${userId}`
		}));
	}

	public async getUserBrief(userId: string): Promise<UserBrief> {
		try {
			return await this.db.get(Object.assign(new UserItem(), {
				pk: `user#${userId}`,
				sk: `user#${userId}`
			}), {
				projection: [ 'userId', 'username', 'firstName', 'lastName', 'avatar', 'userType' ]
			});
		} catch (err) {
			return undefined;
		}
	}

	public async getDriverBrief(userId: string): Promise<DriverBrief> {
		return this.db.get(Object.assign(new UserItem(), {
			pk: `user#${userId}`,
			sk: `user#${userId}`
		}), {
			projection: [ 'userId', 'username', 'firstName', 'lastName', 'avatar', 'userType', 'lastLocation' ]
		});
	}

	public async getUserConnections(userId: string): Promise<DriverBrief> {
		return this.db.get(Object.assign(new UserItem(), {
			pk: `user#${userId}`,
			sk: `user#${userId}`
		}), {
			projection: [ 'connections' ]
		});
	}

	public async getJourneysAsPassenger(userId: string): Promise<Partial<User>> {
		return this.db.get(Object.assign(new UserItem(), {
			pk: `user#${userId}`,
			sk: `user#${userId}`
		}), {
			projection: [ 'journeysAsPassenger' ]
		});
	}

	public async getAllUsersByUni(universityId: string): Promise<User[]> {
		const keyCondition: QueryKey = {
			entity: 'user',
			sk2: `university#${universityId}`
		};
		const queryOptions: QueryOptions = {
			indexName: 'entity-sk2-index'
		};
		const queryIterator: QueryIterator<UserItem> = this.db.query(UserItem, keyCondition, queryOptions);
		const users: User[] = [];
		for await (const user of queryIterator) {
			users.push(user);
		}
		return users;
	}

	public async create(toCreate: Partial<User>): Promise<User> {
		const id: string = uuid();
		return this.db.put(Object.assign(new UserItem(), {
			entity: 'user',
			userId: id,
			pk: `user#${id}`,
			sk: `user#${id}`,
			...toCreate
		}));
	}

	public async createAfterSignUp(userId: string, universityId: string, toCreate: Partial<User>): Promise<User> {
		return this.db.put(Object.assign(new UserItem(), {
			entity: 'user',
			confirmed: false,
			userId,
			pk: `user#${userId}`,
			sk: `user#${userId}`,
			sk2: `univsersity#${universityId}`,
			universityId,
			...toCreate
		}));
	}

	public async update(userId: string, changes: Partial<User>): Promise<User> {
		return this.db.update(Object.assign(new UserItem(), {
			pk: `user#${userId}`,
			sk: `user#${userId}`,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(userId: string): Promise<User | undefined> {
		return this.db.delete(Object.assign(new UserItem(), {
			pk: `user#${userId}`,
			sk: `user#${userId}`
		}), {
			returnValues: 'ALL_OLD'
		});
	}
}
