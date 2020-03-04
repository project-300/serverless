import { MobileNumberNoExtension, User, University } from '@project-300/common-types';
import {
	UnitOfWork,
	TriggerCognitoEvent,
	TriggerCognitoHandler
  } from '../../api-shared-modules/src';

export class AuthController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public postSignUp: TriggerCognitoHandler = async (event: TriggerCognitoEvent) => {
		const cognitoUser: { [key: string]: string } = event.request.userAttributes;
		const user: Partial<User> = {
			email: cognitoUser.email,
			phone: MobileNumberNoExtension(cognitoUser.phone_number)
		};
		let university: University;

		try {
			const universities: University[] = await this.unitOfWork.Universities.getAll();
			universities.forEach((u: University) => {
				const emailIsInThisUni: boolean = u.emailDomains.some((e) => e === user.email);

				if (emailIsInThisUni) university = u;
			});
			user.universityId = university.universityId;
			await this.unitOfWork.Users.createAfterSignUp(cognitoUser.sub, university.universityId, { ...user});

			return event;
		} catch (err) {
			return err;
		}
	}

	public postConfirmation: TriggerCognitoHandler = async (event: TriggerCognitoEvent) => {
		const cognitoUser: { [key: string]: string } = event.request.userAttributes;
		const user: Partial<User> = {
			confirmed: true
		};

		try {
			await this.unitOfWork.Users.update(cognitoUser.sub, { ...user});

			return event;
		} catch (err) {
			return err;
		}
	}
}
