import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';
import { UserController } from './user.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: UserController = new UserController(unitOfWork);

export const getAllUsers: ApiHandler = controller.getAllUsers;
export const getAdminsAndModerators: ApiHandler = controller.getAdminsAndModerators;
export const getCallingUser: ApiHandler = controller.getCallingUser;
export const getAllUsersForOneUni: ApiHandler = controller.getAllUsersForOneUni;
export const getUserById: ApiHandler = controller.getUserById;
export const adminCreateUser: ApiHandler = controller.adminCreateUser;
export const createUser: ApiHandler = controller.createUser;
export const updateUser: ApiHandler = controller.updateUser;
export const deleteUser: ApiHandler = controller.deleteUser;
