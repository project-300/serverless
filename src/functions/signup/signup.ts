import { SignupController } from './signup.controller';
import { ApiHandler } from '../../responses/api.types';

const controller: SignupController = new SignupController();

export const signupHandler: ApiHandler = controller.signup;
