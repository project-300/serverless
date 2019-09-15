import { LiftsController } from './lifts.controller';
import { ApiHandler } from '../../responses/api.types';

const constroller: LiftsController = new LiftsController();

export const liftsSubscriptionHandler: ApiHandler = constroller.getLifts;
