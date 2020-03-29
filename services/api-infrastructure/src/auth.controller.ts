import {
	UnitOfWork,
	TriggerCognitoEvent,
	TriggerCognitoHandler
  } from '../../api-shared-modules/src';
import { User, University, UserTypes } from '@project-300/common-types';

export class AuthController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public postSignUp: TriggerCognitoHandler = async (event: TriggerCognitoEvent) => {
		const cognitoUser: { [key: string]: string } = event.request.userAttributes;
		const user: Partial<User> = {
			email : cognitoUser.email,
			confirmed: false
		};

		try {
			if (event.triggerSource === 'CustomMessage_AdminCreateUser') {
				user.userType = cognitoUser['custom:user_role'] as UserTypes;
				user.confirmed = true;

				if (cognitoUser['custom:university_id'] && user.userType !== 'Admin') {
					const university: University = await this.unitOfWork.Universities.getByIdOnly(cognitoUser['custom:university_id']);

					user.university = {
						universityId: university.universityId,
						name: university.name
					};
				}
			} else {
				user.phone = cognitoUser.phone_number;
				user.userType = 'Passenger';
				user.firstName = cognitoUser.given_name;
				user.lastName = cognitoUser.family_name;

				const universities: University[] = await this.unitOfWork.Universities.getAll();

				const university: University = universities.find((uni: University) => uni.emailDomains.some((e: string) => user.email.includes(e)));
				if (!university) throw new Error();

				user.university = {
					universityId: university.universityId,
					name: university.name
				};
			}

			await this.unitOfWork.Users.createAfterSignUp(cognitoUser.sub, { ...user });

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
			const universityDomains: string[] = await this.unitOfWork.Universities.getAllDomains();
			emailIsInThisUni = universityDomains.some((e: string) => cognitoUser.email.includes(e));
			if (!emailIsInThisUni) throw new Error();

			return event;
		} catch (err) {
			return err;
		}
	}

	public postConfirmation: TriggerCognitoHandler = async (event: TriggerCognitoEvent) => {
		const cognitoUser: { [key: string]: string } = event.request.userAttributes;

		const user: User = await this.unitOfWork.Users.getById(cognitoUser.sub);
		user.confirmed = true;
		user.times.confirmedAt = new Date().toISOString();

		try {
			await this.unitOfWork.Users.update(cognitoUser.sub, { ...user});

			return event;
		} catch (err) {
			return err;
		}
	}
}
