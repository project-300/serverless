import { Interest } from '@project-300/common-types';

export interface IInterestRepository {
	getAll(universityId: string): Promise<Interest[]>;
	getById(journeyId: string, universityId: string): Promise<Interest>;
	getByName(name: string, universityId: string): Promise<Interest | undefined>;
	create(toCreate: Partial<Interest>): Promise<Interest>;
	update(journeyId: string, universityId: string, changes: Partial<Interest>): Promise<Interest>;
	delete(journeyId: string, universityId: string): Promise<Interest | undefined>;
}
