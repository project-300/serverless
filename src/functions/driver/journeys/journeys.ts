import { ApiHandler } from '../../../responses/api.types';
import { JourneyController } from './journeys.controller';

const controller: JourneyController = new JourneyController();

export const myJourneysHandler: ApiHandler = controller.myJourneys;
