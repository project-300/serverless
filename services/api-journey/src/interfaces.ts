import { Coords, Journey } from '@project-300/common-types';
import { JourneyItem } from '../../api-shared-modules/src/models/core';

export interface MyJourneysData {
	userId: string;
}

export interface CreateJourneyData {
	userId: string;
	journey: Partial<Journey>;
}

export interface QueryAllJourneysData {
	lastEvaluatedKey?: Partial<JourneyItem>;
}

export interface JourneyDetailsData {
	journeyId: string;
}

export interface CancelPassengerAcceptedJourneyData {
	journeyId: string;
	userId: string;
}

export interface DriverMovementData {
	journeyId: string;
	coords: Coords;
}

export interface DriverSubscriptionData {
	subscription: string;
	subscribe: boolean;
	journeyId: string;
}
