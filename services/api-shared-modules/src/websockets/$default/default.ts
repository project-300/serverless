import { ApiHandler } from '../..';
import { DefaultController } from './default.controller';

const controller: DefaultController = new DefaultController();

export const defaultHandler: ApiHandler = controller.default;
