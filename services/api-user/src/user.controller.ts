import { User } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork
  } from '../../api-shared-modules/src';

export class UserController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public getallUsers: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const users: User[] = await this.unitOfWork.Users.getAll();
			if (!users) {
				return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed at getting Users');
			}

			return ResponseBuilder.ok(users);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get users');
		}
	}

	public getUserById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.userId) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}

		const userId: string = event.pathParameters.userId;

		try {
			const user: User = await this.unitOfWork.Users.getById(userId);

			if (!user) {
				return ResponseBuilder.notFound(ErrorCode.InvalidId, 'User Not found');
			}

			return ResponseBuilder.ok(user);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get user');
		}
	}

	public createUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		}
		const user: Partial<User> = JSON.parse(event.body);

		try {
			const result: User = await this.unitOfWork.Users.create({ ...user});

			if (!result) {
				return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'failed to create new user');
			}

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to create a new user');
		}
	}

	public updateUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		}

		const user: Partial<User> = JSON.parse(event.body);

		try {
			const result: User = await this.unitOfWork.Users.update(user.userId, { ...user});
			if (!result) {
				return ResponseBuilder.notFound(ErrorCode.InvalidId, 'user not found');
			}

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to update user');
		}
	}

	public deleteUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.userId) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}

		const userId: string = event.pathParameters.userId;

		try {
			const result: User = await this.unitOfWork.Users.delete(userId);

			if (!result) {
				return ResponseBuilder.notFound(ErrorCode.InvalidId, 'user not found');
			}

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

}
