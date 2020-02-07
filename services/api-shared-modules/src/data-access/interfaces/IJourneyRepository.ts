import { Journey } from '@project-300/common-types';

export interface IJourneyRepository {
	getAll(): Promise<Journey[]>;
	getById(journeyId: string): Promise<Journey>;
	getByIdWithProjection(journeyId: string, projection: string[]): Promise<Journey>;
	create(toCreate: Partial<Journey>): Promise<Journey>;
	update(journeyId: string, changes: Partial<Journey>): Promise<Journey>;
	delete(journeyId: string): Promise<Journey | undefined>;
}
