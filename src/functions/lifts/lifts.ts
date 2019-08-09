import { ApiHandler } from '../../responses/api.interfaces';
import { LiftsController } from './lifts.controller';

const controller: LiftsController = new LiftsController();

export const liftsHandler: ApiHandler = controller.getLifts;
