import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';
import { UniversityController } from './university.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: UniversityController = new UniversityController(unitOfWork);

export const getAllUniversities: ApiHandler = controller.getAllUniversities;
export const getUniversityById: ApiHandler = controller.getUniversityById;
export const getAllUniversityDomains: ApiHandler = controller.getAllUniversityDomains;
export const createUniversity: ApiHandler = controller.createUniversity;
export const updateUniversity: ApiHandler = controller.updateUniversity;
export const deleteUniversity: ApiHandler = controller.deleteUniversity;
