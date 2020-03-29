import { University } from '@project-300/common-types';

export interface IUniversityRepository {
	getAll(): Promise<University[]>;
	getAllDomains(): Promise<string[]>;
	getById(universityId: string, name: string): Promise<University>;
	getByIdOnly(universityId: string): Promise<University>;
	getByName(name: string): Promise<University>;
	create(toCreate: Partial<University>): Promise<University>;
	update(universityId: string, name: string, changes: Partial<University>): Promise<University>;
	delete(universityId: string, name: string): Promise<University | undefined>;
}
