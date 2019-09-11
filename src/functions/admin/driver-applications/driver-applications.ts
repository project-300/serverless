import { ApiHandler } from '../../../responses/api.types';
import { DriverApplicationController } from './driver-applications.controller';

const controller: DriverApplicationController = new DriverApplicationController();

export const driverApplicationsSubscriptionHandler: ApiHandler = controller.getApplications;
export const approveApplicationHandler: ApiHandler = controller.approveApplication;
export const deleteApplicationHandler: ApiHandler = controller.deleteApplication;
