import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';
import { ChatController } from './chat.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: ChatController = new ChatController(unitOfWork);

export const getAllChatsByUser: ApiHandler = controller.getAllChatsByUser;
export const getChatById: ApiHandler = controller.getChatById;
export const getChatByUsers: ApiHandler = controller.getChatByUsers;
export const createChat: ApiHandler = controller.createChat;
export const updateChat: ApiHandler = controller.updateChat;
export const deleteChat: ApiHandler = controller.deleteChat;
