import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';
import { MessageController } from './message.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: MessageController = new MessageController(unitOfWork);

export const getAllMessagesByChat: ApiHandler = controller.getAllMessagesByChat;
export const getMessageById: ApiHandler = controller.getMessageById;
export const createMessage: ApiHandler = controller.createMessage;
export const deleteMessage: ApiHandler = controller.deleteMessage;
