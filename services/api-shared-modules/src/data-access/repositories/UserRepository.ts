import { UserItem } from './../../models/core/User';
import { User } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { Entity } from '../interfaces';

export class UserRepository extends Repository {

	public async getAll(): Promise<User[]> {
		const keyCondition: Entity = {
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
