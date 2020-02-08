import { ApiHandler } from '../../../api-shared-modules/src';
import { ConnectController } from './connect.controller';

const controller: ConnectController = new ConnectController();

export const connectHandler: ApiHandler = controller.connect;
