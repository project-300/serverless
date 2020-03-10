import { UnitOfWork, TriggerCognitoHandler } from '../../api-shared-modules/src';
import { AuthController } from './auth.controller';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: AuthController = new AuthController(unitOfWork);

export const postSignUp: TriggerCognitoHandler = controller.postSignUp;
export const postConfirmation: TriggerCognitoHandler = controller.postConfirmation;
export const preSignUp: TriggerCognitoHandler = controller.preSignUp;
