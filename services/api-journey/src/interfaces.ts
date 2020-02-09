import { Coords, Journey } from '@project-300/common-types';

export interface MyJourneysData {
	userId: string;
}

export interface CreateJourneyData {
	userId: string;
	journey: Partial<Journey>;
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
