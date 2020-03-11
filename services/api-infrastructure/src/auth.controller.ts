import { MobileNumberNoExtension, User, University, UserTypes } from '@project-300/common-types';
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
			email : cognitoUser.email,
			confirmed: false
		};

		let university: Partial<University> = { };

		try {
			if (event.triggerSource === 'CustomMessage_AdminCreateUser') {
				user.userType = cognitoUser['custom:user_role'] as UserTypes;
				user.confirmed = true;
				university.universityId = user.userType !== 'Admin' ? cognitoUser['custom:university_Id'] : ' ';
			} else {
				user.phone = MobileNumberNoExtension(cognitoUser.phone_number);
				user.userType = 'Passenger';
				const universities: University[] = await this.unitOfWork.Universities.getAll();
				universities.forEach((u: University) => {
					const emailIsInThisUni: boolean = u.emailDomains.some((e) => user.email.includes(e));

					if (emailIsInThisUni) university = u;
				});
			}

			await this.unitOfWork.Users.createAfterSignUp(cognitoUser.sub, university.universityId, { ...user});

			return event;
		} catch (err) {
			return err;
		}
	}

	public preSignUp: TriggerCognitoHandler = async (event: TriggerCognitoEvent) => {
		if (event.triggerSource === 'PreSignUp_AdminCreateUser') return event;

		const cognitoUser: { [key: string]: string } = event.request.userAttributes;
		let emailIsInThisUni: boolean = false;

		try {
			const universities: University[] = await this.unitOfWork.Universities.getAll();
			universities.forEach((u: University) => {
				emailIsInThisUni = u.emailDomains.some((e) => cognitoUser.email.includes(e));
			});
			if (!emailIsInThisUni) throw new Error();

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
