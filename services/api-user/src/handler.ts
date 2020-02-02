import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';
import { UserController } from './user.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: UserController = new UserController(unitOfWork);

export const getUserById: ApiHandler = controller.getUserById;
