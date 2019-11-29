import { ApiHandler } from '../../../responses/api.types';
import { JourneyController } from './journeys.controller';

const controller: JourneyController = new JourneyController();

export const myJourneysHandler: ApiHandler = controller.myJourneys;
export const journeyDetailsHandler: ApiHandler = controller.getJourneyDetails;
export const startJourneyHandler: ApiHandler = controller.startJourney;
