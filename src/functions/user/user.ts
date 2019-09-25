import { ApiHandler } from '../../responses/api.types';
import { UserController } from './user.controller';

const controller: UserController = new UserController();

export const userProfileSubscriptionHandler: ApiHandler = controller.getUser;
export const userUpdateEmailHandler: ApiHandler = controller.updateEmail;
