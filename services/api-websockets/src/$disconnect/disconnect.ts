import { ApiHandler } from '../../../api-shared-modules/src';
import { DisconnectController } from './disconnect.controller';

const controller: DisconnectController = new DisconnectController();

export const disconnectHandler: ApiHandler = controller.disconnect;
