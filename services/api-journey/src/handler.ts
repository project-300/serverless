import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';
import { JourneyController } from './journey.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: JourneyController = new JourneyController(unitOfWork);

export const getAllJourneys: ApiHandler = controller.getAllJourneys;
export const searchJourneys: ApiHandler = controller.searchJourneys;
export const getJourneyById: ApiHandler = controller.getJourneyById;
export const createJourney: ApiHandler = controller.createJourney;
export const updateJourney: ApiHandler = controller.updateJourney;
export const deleteJourney: ApiHandler = controller.deleteJourney;
export const addUserToJourney: ApiHandler = controller.addUserToJourney;
export const getDriverJourneys: ApiHandler = controller.getDriverJourneys;
export const getPassengerJourneys: ApiHandler = controller.getPassengerJourneys;
export const startJourney: ApiHandler = controller.startJourney;
export const pauseJourney: ApiHandler = controller.pauseJourney;
export const resumeJourney: ApiHandler = controller.resumeJourney;
export const endJourney: ApiHandler = controller.endJourney;
export const cancelJourney: ApiHandler = controller.cancelJourney;
export const cancelPassengerAcceptedJourney: ApiHandler = controller.cancelPassengerAcceptedJourney;
export const subscribeDriverLocation: ApiHandler = controller.subscribeDriverLocation;
export const unsubscribeDriverLocation: ApiHandler = controller.unsubscribeDriverLocation;
export const driverMovement: ApiHandler = controller.driverMovement;
export const driverConfirmPassengerPickup: ApiHandler = controller.driverConfirmPassengerPickup;
export const passengerConfirmPassengerPickup: ApiHandler = controller.passengerConfirmPickup;
export const driverCancelPassengerPickup: ApiHandler = controller.driverCancelPassengerPickup;
export const passengerCancelPickup: ApiHandler = controller.passengerCancelPickup;
