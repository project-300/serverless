import { ApiHandler } from '../../responses/api.types';
import { ConfirmationController } from './confirmation.controller';

const controller: ConfirmationController = new ConfirmationController();

export const confirmationHandler: ApiHandler = controller.confirmAccount;
