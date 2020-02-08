import { ApiHandler } from '../../../api-shared-modules/src';
import { DefaultController } from './default.controller';

const controller: DefaultController = new DefaultController();

export const defaultHandler: ApiHandler = controller.default;
