import { ApiHandler } from '../../responses/api.types';
import { UserController } from './user.controller';

const controller: UserController = new UserController();

export const userProfileSubscriptionHandler: ApiHandler = controller.getUser;
export const userUpdateFieldHandler: ApiHandler = controller.updateUserField;
export const userUpdateAvatarHandler: ApiHandler = controller.updateAvatar;
