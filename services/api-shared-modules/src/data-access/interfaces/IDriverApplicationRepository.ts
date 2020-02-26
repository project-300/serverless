import { DriverApplicationObject, Vehicle } from '@project-300/common-types';

export interface IDriverApplicationRepository {
	getAll(approved: string): Promise<DriverApplicationObject[]>;
	getByUserId(userId: string): Promise<DriverApplicationObject>;
	create(userId: string, vehicle: Vehicle): Promise<DriverApplicationObject>;
	update(userId: string, changes: Partial<DriverApplicationObject>): Promise<DriverApplicationObject>;
	delete(userId: string): Promise<DriverApplicationObject>;
}
