import { User, LastEvaluatedKey } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork,
	SharedFunctions,
	UserItem
} from '../../api-shared-modules/src';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { USER_POOL_ID } from '../../../environment/env';
import { AdminCreateUserResponse } from 'aws-sdk/clients/cognitoidentityserviceprovider';

export class UserController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public getAllUsers: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		let lastEvaluatedKey: LastEvaluatedKey;
		if (event.body) {
			const { pk, sk, sk2, entity}: LastEvaluatedKey = JSON.parse(event.body) as LastEvaluatedKey;
			lastEvaluatedKey = {
				pk,
				sk,
				sk2,
				entity
			};
		}
		try {
			const result: { users: User[]; lastEvaluatedKey: Partial<UserItem> } = await this.unitOfWork.Users.getAll(lastEvaluatedKey);
			if (!result) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed at getting Users');

			return ResponseBuilder.ok({ ...result, count: result.users.length });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public getAdminsAndModerators: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const users: User[] = await this.unitOfWork.Users.getAdminsAndModerators();
			if (!users) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Users');

			const admins: User[] = users.filter((u: User) => u.userType === 'Admin');
			const moderators: { [key: string]: User[] } = users.filter((u: User) => u.userType === 'Moderator').reduce((memo: { [key: string]: User[] }, user: User) => {
				if (memo[user.university.name]) memo[user.university.name].push(user);
				else memo[user.university.name] = [ user ];

				return memo;
			}, { });

			return ResponseBuilder.ok({ admins, moderators });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public getAllUsersForOneUni: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

		try {
			const user: User = await this.unitOfWork.Users.getById(userId);
			const rightRole: boolean = SharedFunctions.checkRole(['Moderator'], user.userType);

			if (!rightRole) return ResponseBuilder.forbidden(ErrorCode.ForbiddenAccess, 'Unauthorized');

			let users: User[] = await this.unitOfWork.Users.getAllUsersByUni(user.university.universityId);
			if (!users) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed at getting Users');

			users = SharedFunctions.orderByDate(true, users) as User[];

			return ResponseBuilder.ok({ users });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public adminCreateUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		}
		const user: Partial<User> = JSON.parse(event.body) as Partial<User>;
		const cognito: CognitoIdentityServiceProvider = new CognitoIdentityServiceProvider();
		const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
		try {
			const callingUser: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole(['Admin'], callingUser.userType);

			const newUser: AdminCreateUserResponse = await cognito.adminCreateUser({
				DesiredDeliveryMediums: ['EMAIL'],
				Username: user.email,
				UserPoolId: USER_POOL_ID,
				UserAttributes: [
					{
						Name: 'custom:user_role',
						Value: user.userType
					},
					{
						Name: 'custom:university_id',
						Value: user.university.universityId
					}
				]
			}).promise();

			return ResponseBuilder.ok({ newUser });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public getCallingUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		// remember to update the react native for this
		const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
		try {

			const user: User = await this.unitOfWork.Users.getById(userId);
			if (!user) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'User Not found');

			return ResponseBuilder.ok({ user });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public getUserById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.userId) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}
		const userId: string = event.pathParameters.userId;

		try {

			const user: User = await this.unitOfWork.Users.getById(userId);
			if (!user) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'User Not found');

			return ResponseBuilder.ok({ user });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public createUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		}
		const user: Partial<User> = JSON.parse(event.body) as Partial<User>;

		try {
			const result: User = await this.unitOfWork.Users.create({ ...user });
			if (!result) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'failed to create new user');

			return ResponseBuilder.ok({ user: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public updateUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		}

		const user: Partial<User> = JSON.parse(event.body) as Partial<User>;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const result: User = await this.unitOfWork.Users.update(userId, { ...user });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'User not found');

			return ResponseBuilder.ok({ user: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public deleteUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.userId) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}

		const userId: string = event.pathParameters.userId;

		try {
			const user: User = await this.unitOfWork.Users.delete(userId);
			if (!user) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'User not found');

			return ResponseBuilder.ok({ user });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

}
