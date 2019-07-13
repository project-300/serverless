import { ApiHandler } from '../responses/api.interfaces';
import { ConnectController } from './connect.controller';

const controller: ConnectController = new ConnectController();

export const connectHandler: ApiHandler = controller.connect;
