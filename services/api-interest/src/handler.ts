import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';
import { InterestController } from './interest.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: InterestController = new InterestController(unitOfWork);

export const getAllInterestsRawByUniversity: ApiHandler = controller.getAllInterestsRawByUniversity;
export const getAllInterestsListByUniversity: ApiHandler = controller.getAllInterestsListByUniversity;
export const getInterestById: ApiHandler = controller.getInterestById;
export const createInterest: ApiHandler = controller.createInterest;
export const updateInterest: ApiHandler = controller.updateInterest;
export const deleteInterest: ApiHandler = controller.deleteInterest;
