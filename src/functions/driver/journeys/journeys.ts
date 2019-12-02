import { ApiHandler } from '../../../responses/api.types';
import { JourneyController } from './journeys.controller';

const controller: JourneyController = new JourneyController();

export const driverJourneysHandler: ApiHandler = controller.driverJourneys;
export const passengerJourneysHandler: ApiHandler = controller.passengerJourneys;
export const journeyDetailsHandler: ApiHandler = controller.getJourneyDetails;
export const startJourneyHandler: ApiHandler = controller.startJourney;
export const endJourneyHandler: ApiHandler = controller.endJourney;
export const driverMovementHandler: ApiHandler = controller.driverMovement;
export const driverLocationSubscriptionHandler: ApiHandler = controller.subscribeDriverLocation;
export const cancelPassengerAcceptedJourneyHandler: ApiHandler = controller.cancelPassengerAcceptedJourney;
