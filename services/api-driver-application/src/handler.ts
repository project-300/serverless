import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';
import { DriverApplicationController } from './driverapplication.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: DriverApplicationController = new DriverApplicationController(unitOfWork);

export const getAllApplications: ApiHandler = controller.getAllApplications;
export const getApplicationByUserId: ApiHandler = controller.getApplicationByUserId;
export const approveApplication: ApiHandler = controller.approveApplication;
export const deleteApplication: ApiHandler = controller.deleteApplication;
export const applyForApplication: ApiHandler = controller.applyForApplication;
export const checkIfUserHasApplied: ApiHandler = controller.checkIfUserHasApplied;
