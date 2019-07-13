import { ApiHandler } from '../responses/api.interfaces';
import { DefaultController } from './default.controller';

const controller: DefaultController = new DefaultController();

export const defaultHandler: ApiHandler = controller.default;
