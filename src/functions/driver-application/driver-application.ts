import { ApiHandler } from '../../responses/api.types';
import { DriverApplicationController } from './driver-application.controller';

const controller: DriverApplicationController = new DriverApplicationController();

export const driverApplicationCheckHandler: ApiHandler = controller.check;
export const driverApplicationHandler: ApiHandler = controller.apply;
