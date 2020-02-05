import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';
import { JourneyController } from './journey.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: JourneyController = new JourneyController(unitOfWork);

export const getAllJourneys: ApiHandler = controller.getAllJourneys;
export const getJourneyById: ApiHandler = controller.getJourneyById;
export const createJourney: ApiHandler = controller.createJourney;
export const updateJourney: ApiHandler = controller.updateJourney;
export const deleteJourney: ApiHandler = controller.deleteJourney;
