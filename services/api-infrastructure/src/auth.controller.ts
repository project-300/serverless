import { User } from '@project-300/common-types';
import {
	ResponseBuilder,
	UnitOfWork,
	TriggerCognitoEvent,
	TriggerCognitoHandler
  } from '../../api-shared-modules/src';

export class AuthController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public preSignUp: TriggerCognitoHandler = async (event: TriggerCognitoEvent) => {
		const cognitoUser = event.request.userAttributes;
		const user: Partial<User> = {
			email: cognitoUser.email
			// firstName: cognitoUser.given_name,
			// lastName: cognitoUser.family_name,
			// phone: cognitoUser.phone
		};

		try {
			const result: User = await this.unitOfWork.Users.createAfterSignUp(cognitoUser.sub, { ...user});

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public postConfirmation: TriggerCognitoHandler = async (event: TriggerCognitoEvent) => {
		const cognitoUser = event.request.userAttributes;
		const user: Partial<User> = {
			confirmed: true
		};

		try {
			const result: User = await this.unitOfWork.Users.update(cognitoUser.sub, { ...user});

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}
}
