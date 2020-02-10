import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';
import { InterestController } from './interest.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: InterestController = new InterestController(unitOfWork);

export const getAllUniversities: ApiHandler = controller.getAllUniversities;
export const getUniversityById: ApiHandler = controller.getUniversityById;
export const createUniversity: ApiHandler = controller.createUniversity;
export const updateUniversity: ApiHandler = controller.updateUniversity;
export const deleteUniversity: ApiHandler = controller.deleteUniversity;
