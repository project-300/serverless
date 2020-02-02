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

	public getUserById: ApiHandler = async (event: ApiEvent, context: ApiContext) => {
		if (!event.pathParameters || !event.pathParameters.Id) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}
		const userId: string = event.pathParameters.UserId;

		try {
			const user: User = await this.unitOfWork.Users.getById(userId);
			if (!user) {
				return ResponseBuilder.notFound(ErrorCode.BadRequest, 'Not found');
			}

			return ResponseBuilder.ok(user);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get user');
		}
	}

}
