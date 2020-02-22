import { Journey } from '@project-300/common-types';
import { JourneyItem } from '../../models/core';

export interface IJourneyRepository {
	getAll(lastEvaluatedKey?: Partial<JourneyItem>): Promise<{ journeys: Journey[]; lastEvaluatedKey: Partial<JourneyItem>}>;
	getUserJourneys(userId: string): Promise<Journey[]>;
	getJourneysWithIds(journeyIds: string[]): Promise<Journey[]>;
	getById(journeyId: string, createdAt: string): Promise<Journey>;
	getByIdWithProjection(journeyId: string, createdAt: string, projection: string[]): Promise<Journey>;
	create(toCreate: Partial<Journey>): Promise<Journey>;
	update(journeyId: string, createdAt: string, changes: Partial<Journey>): Promise<Journey>;
	delete(journeyId: string, createdAt: string): Promise<Journey | undefined>;
	searchJourneys(query: string, lastEvaluatedKey?: Partial<JourneyItem>):
		Promise<{ journeys: Journey[]; lastEvaluatedKey: Partial<JourneyItem>} >;
}
