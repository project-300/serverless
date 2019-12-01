import { ApiHandler } from '../../responses/api.types';
import { JourneyController } from './journey.controller';

const controller: JourneyController = new JourneyController();

export const allJourneysHandler: ApiHandler = controller.allJourneys;
