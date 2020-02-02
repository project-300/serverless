import { User } from '@project-300/common-types';

export interface IUserRepository {
	getById(userId: string): Promise<User>;
}
