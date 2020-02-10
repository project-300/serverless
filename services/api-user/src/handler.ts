import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';
import { UserController } from './user.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: UserController = new UserController(unitOfWork);

export const getAllUsers: ApiHandler = controller.getAllUsers;
export const getUserById: ApiHandler = controller.getUserById;
export const createUser: ApiHandler = controller.createUser;
export const updateUser: ApiHandler = controller.updateUser;
export const deleteUser: ApiHandler = controller.deleteUser;
