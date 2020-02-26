import { DriverBrief, User, UserBrief } from '@project-300/common-types';

export interface IUserRepository {
	getAll(): Promise<User[]>;
	getById(userId: string): Promise<User>;
	getUserBrief(userId: string): Promise<UserBrief>;
	getUserConnections(userId: string): Promise<Partial<User>>;
	getDriverBrief(userId: string): Promise<DriverBrief>;
	getJourneysAsPassenger(userId: string): Promise<Partial<User>>;
	create(toCreate: Partial<User>): Promise<User>;
	update(userId: string, changes: Partial<User>): Promise<User>;
	delete(userId: string): Promise<User | undefined>;
	createAfterSignUp(userId: string, toCreate: Partial<User>): Promise<User>;
}
