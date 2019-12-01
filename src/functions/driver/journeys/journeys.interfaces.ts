import { Coords } from '@project-300/common-types';

export interface MyJourneysData {
	userId: string;
}

export interface JourneyDetailsData {
	journeyId: string;
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
