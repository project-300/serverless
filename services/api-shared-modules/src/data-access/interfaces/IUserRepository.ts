import { DriverBrief, User, UserBrief, LastEvaluatedKey } from '@project-300/common-types';
import { UserItem } from '../..';

export interface IUserRepository {
	getAll(lastEvaluatedKey?: LastEvaluatedKey): Promise<{ users: User[]; lastEvaluatedKey: Partial<UserItem> }>;
	getById(userId: string): Promise<User>;
	getUserBrief(userId: string): Promise<UserBrief>;
	getUserConnections(userId: string): Promise<Partial<User>>;
	getUserStats(userId: string): Promise<Partial<User>>;
	getDriverBrief(userId: string): Promise<DriverBrief>;
	getJourneysAsPassenger(userId: string): Promise<Partial<User>>;
	create(toCreate: Partial<User>): Promise<User>;
	update(userId: string, changes: Partial<User>): Promise<User>;
	delete(userId: string): Promise<User | undefined>;
	createAfterSignUp(userId: string, universityId: string, toCreate: Partial<User>): Promise<User>;
	getAllUsersByUni(universityId: string): Promise<User[]>;
}
