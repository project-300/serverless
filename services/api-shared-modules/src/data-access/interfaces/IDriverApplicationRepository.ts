import { DriverApplicationObject } from '@project-300/common-types';

export interface IDriverApplicationRepository {
	getAll(approved: boolean, universityId: string): Promise<DriverApplicationObject[]>;
	getByUserId(userId: string): Promise<DriverApplicationObject>;
	create(userId: string, universityId: string, application: Partial<DriverApplicationObject>): Promise<DriverApplicationObject>;
	update(userId: string, changes: Partial<DriverApplicationObject>): Promise<DriverApplicationObject>;
	delete(userId: string): Promise<DriverApplicationObject>;
}
