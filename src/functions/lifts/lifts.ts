import { LiftsController } from './lifts.controller';
import { ApiHandler } from '../../responses/api.types';

const controller: LiftsController = new LiftsController();

export const liftsSubscriptionHandler: ApiHandler = controller.getLifts;
export const addLiftHandler: ApiHandler = controller.addLift;
