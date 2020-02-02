import { UserItem } from './../../models/core/User';
import { User } from '@project-300/common-types';
// import { QueryOptions } from '@aws/dynamodb-data-mapper';
// import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';

export class UserRepository extends Repository {

	public async getById(userId: string): Promise<User> {
		return this.db.get(Object.assign(new UserItem(), {
			pk: `user#${userId}`,
			sk: `user#${userId}`
		}));
	}
}
