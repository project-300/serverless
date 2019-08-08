import { ApiHandler } from '../responses/api.types';
import { DefaultController } from './default.controller';

const controller: DefaultController = new DefaultController();

export const defaultHandler: ApiHandler = controller.default;
