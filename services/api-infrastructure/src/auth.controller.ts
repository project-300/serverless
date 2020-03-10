import { MobileNumberNoExtension, User, University } from '@project-300/common-types';
import {
	UnitOfWork,
	TriggerCognitoEvent,
	TriggerCognitoHandler
  } from '../../api-shared-modules/src';

export class AuthController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public postSignUp: TriggerCognitoHandler = async (event: TriggerCognitoEvent) => {
		console.log(event);
		const cognitoUser: { [key: string]: string } = event.request.userAttributes;
		const user: Partial<User> = {
			email : cognitoUser.email
		};

		let university: University;

		try {
			if (cognitoUser['cognito:user_status'] === 'FORCE_CHANGE_PASSWORD') {
				user.userType = cognitoUser.user_role as 'Passenger' | 'Driver' | 'Moderator' | 'Admin';
				if (user.userType !== 'Admin') {
					university.universityId = cognitoUser.university_Id;
				}
				university.universityId = '';
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
