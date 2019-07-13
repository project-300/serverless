import { ApiHandler } from '../responses/api.interfaces';
import { DisconnectController } from './disconnect.controller';

const controller: DisconnectController = new DisconnectController();

export const disconnectHandler: ApiHandler = controller.disconnect;
