import { ApiHandler } from '../../responses/api.interfaces';
import { LoginController } from './login.controller';

const controller: LoginController = new LoginController();

export const loginHandler: ApiHandler = controller.login;
