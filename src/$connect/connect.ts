import { ApiHandler } from '../responses/api.types';
import { ConnectController } from './connect.controller';

const controller: ConnectController = new ConnectController();

export const connectHandler: ApiHandler = controller.connect;
