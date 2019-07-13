import { ApiHandler } from '../../responses/api.interfaces';
import { MessageController } from './message.controller';

const controller: MessageController = new MessageController();

export const sendMessageHandler: ApiHandler = controller.sendMessage;
