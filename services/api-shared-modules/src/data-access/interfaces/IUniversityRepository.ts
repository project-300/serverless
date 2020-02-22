import { University } from '@project-300/common-types';

export interface IUniversityRepository {
	getAll(): Promise<University[]>;
	getAllDomains(): Promise<string[]>;
	getById(universityId: string): Promise<University>;
	create(toCreate: Partial<University>): Promise<University>;
	update(universityId: string, changes: Partial<University>): Promise<University>;
	delete(universityId: string): Promise<University | undefined>;
}
