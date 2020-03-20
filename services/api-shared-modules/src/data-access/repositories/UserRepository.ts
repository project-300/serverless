import { UserItem } from '../../models/core';
import { DriverBrief, User, UserBrief, LastEvaluatedKey } from '@project-300/common-types';
import { QueryOptions, QueryIterator, QueryPaginator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { QueryKey } from '../interfaces';
import { beginsWith, ConditionExpression, inList, MembershipExpressionPredicate } from '@aws/dynamodb-expressions';

export class UserRepository extends Repository {

	public async getAll(lastEvaluatedKey?: LastEvaluatedKey): Promise<{ users: User[]; lastEvaluatedKey: Partial<UserItem> }> {
		const predicate: MembershipExpressionPredicate = inList('Passenger', 'Driver');

		const expression: ConditionExpression = {
			...predicate,
			subject: 'userType'
		};

		const keyCondition: QueryKey = {
			entity: 'user'
		};
		const queryOptions: QueryOptions = {
			indexName: 'entity-sk2-index',
			scanIndexForward: false,
			startKey: lastEvaluatedKey,
			filter: expression,
			limit: 5
		};

		const queryPages: QueryPaginator<UserItem> = this.db.query(UserItem, keyCondition, queryOptions).pages();
		const users: User[] = [];
		for await (const page of queryPages) {
			for (const user of page)
				users.push(user);
		}
		return {
			users,
			lastEvaluatedKey:
				queryPages.lastEvaluatedKey ?
					queryPages.lastEvaluatedKey :
					undefined
		};
	}

	public async getAdminsAndModerators(): Promise<User[]> {
		const predicate: MembershipExpressionPredicate = inList('Moderator', 'Admin');

		const expression: ConditionExpression = {
			...predicate,
			subject: 'userType'
		};

		const keyCondition: QueryKey = {
			entity: 'user'
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index',
			filter: expression
		};

		const queryIterator: QueryIterator<UserItem> = this.db.query(UserItem, keyCondition, queryOptions);
		const users: User[] = [];

		for await (const user of queryIterator) users.push(user);

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

	public async getUserStats(userId: string): Promise<Partial<User>> {
		return this.db.get(Object.assign(new UserItem(), {
			pk: `user#${userId}`,
			sk: `user#${userId}`
		}), {
			projection: [ 'userId', 'statistics' ]
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
		const predicate: MembershipExpressionPredicate = inList('Passenger', 'Driver');

		const expression: ConditionExpression = {
			...predicate,
			subject: 'userType'
		};

		const keyCondition: QueryKey = {
			entity: 'user',
			sk2: beginsWith(`university#${universityId}`)
		};
		const queryOptions: QueryOptions = {
			indexName: 'entity-sk2-index',
			filter: expression
		};
		const queryIterator: QueryIterator<UserItem> = this.db.query(UserItem, keyCondition, queryOptions);
		const users: User[] = [];
		for await (const user of queryIterator) {
			users.push(user);
		}
		return users;
	}

	public async create(toCreate: Partial<User>): Promise<User> { // NOT TO BE USED
		const id: string = uuid();
		return this.db.put(Object.assign(new UserItem(), {
			entity: 'user',
			userId: id,
			pk: `user#${id}`,
			sk: `user#${id}`,
			averageRating: 0,
			totalRatings: 0,
			statistics: {
				emissions: 0,
				distance: 0,
				fuel: 0,
				liftsGiven: 0,
				liftsTaken: 0
			},
			connections: [],
			isDriving: false,
			journeysAsPassenger: [],
			interests: [],
			isOnJourney: false,
			...toCreate
		}));
	}

	public async createAfterSignUp(userId: string, toCreate: Partial<User>): Promise<User> {
		const date: string = new Date().toISOString();

		return this.db.put(Object.assign(new UserItem(), {
			entity: 'user',
			confirmed: false,
			userId,
			pk: `user#${userId}`,
			sk: `user#${userId}`,
			sk2: toCreate.university ?
				`university#${toCreate.university.universityId}/createdAt#${date}` :
				`admin#createdAt#${date}`,
			times: {
				createdAt: date
			},
			averageRating: 0,
			totalRatings: 0,
			statistics: {
				emissions: 0,
				distance: 0,
				fuel: 0,
				liftsGiven: 0,
				liftsTaken: 0
			},
			connections: [],
			isDriving: false,
			journeysAsPassenger: [],
			interests: [],
			isOnJourney: false,
			...toCreate
		}));
	}

	public async update(userId: string, changes: Partial<User>): Promise<User> {
		delete changes.sk2;
		delete changes.sk3;

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
