import { ConfirmationController } from './confirmation.controller';
import { ApiHandler } from '../../responses/api.interfaces';

const controller: ConfirmationController = new ConfirmationController();

export const confirmationHandler: ApiHandler = controller.confirmAccount;
