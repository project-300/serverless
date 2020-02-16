import { Journey } from '@project-300/common-types';

export interface IJourneyRepository {
	getAll(): Promise<Journey[]>;
	getUserJourneys(userId: string): Promise<Journey[]>;
	getJourneysWithIds(journeyIds: string[]): Promise<Journey[]>;
	getById(journeyId: string, createdAt: string): Promise<Journey>;
	getByIdWithProjection(journeyId: string, createdAt: string, projection: string[]): Promise<Journey>;
	create(toCreate: Partial<Journey>): Promise<Journey>;
	update(journeyId: string, createdAt: string, changes: Partial<Journey>): Promise<Journey>;
	delete(journeyId: string, createdAt: string): Promise<Journey | undefined>;
}
