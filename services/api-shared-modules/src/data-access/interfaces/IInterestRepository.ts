import { Interest } from '@project-300/common-types';

export interface IInterestRepository {
	getAll(): Promise<Interest[]>;
	getById(journeyId: string): Promise<Interest>;
	create(toCreate: Partial<Interest>): Promise<Interest>;
	update(journeyId: string, changes: Partial<Interest>): Promise<Interest>;
	delete(journeyId: string): Promise<Interest | undefined>;
}
