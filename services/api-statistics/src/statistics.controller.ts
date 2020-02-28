import {
	ResponseBuilder,
	ErrorCode,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork,
	ApiResponse,
	// SharedFunctions
  } from '../../api-shared-modules/src';
import { DayStatistics, University } from '@project-300/common-types';

export class StatisticsController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public createStatisticsDayForEachUni: ApiHandler = async (): Promise<string> => {
		const statsObject: Partial<DayStatistics> = {
			emissions: 0,
			fuel: 0,
			distance: 0,
			passengers: [],
			drivers: []
		};

		try {
			const universities: University[] = await this.unitOfWork.Universities.getAll();
			const universityIds: string[] = universities.map((u: University) => u.universityId);

			await Promise.all(universityIds.map(async (id: string) => this.unitOfWork.Statistics.create(id, statsObject)));

			return 'Success';
		} catch (err) {
			return 'Failure';
		}
	}

	public getStatisticsDayById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.statisticsId || !event.queryStringParameters
			|| !event.queryStringParameters.date || !event.queryStringParameters.universityId) {
				return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
			}
		const statisticsId: string = event.pathParameters.statisticsId;
		const { date, universityId }: { [params: string]: string} = event.queryStringParameters;
		const parsedDate: string = this._parseOutDate(date);
		console.log(parsedDate);
		// const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

		try {
			// const user: UserBrief = await this.unitOfWork.Users.getUserBrief(userId);
			// const rightRole: boolean = SharedFunctions.checkRole(['Admin', 'Moderator'], user.userType);

			// if (!rightRole) return ResponseBuilder.forbidden(ErrorCode.ForbiddenAccess, 'Unauthorized');

			const result: DayStatistics[] = await this.unitOfWork.Statistics.getByIdAndDate(statisticsId, universityId, parsedDate);
			// if (!result) {
			// 	return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Statistics Not Found');
			// }
			console.log(result);

			return ResponseBuilder.ok({ statistics: result[0] });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get Statistics');
		}
	}

	private _parseOutDate = (fullDate: string): string => fullDate.split('T')[0];

	// public getAllUsers: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
	// 	try {
	// 		const users: User[] = await this.unitOfWork.Users.getAll();
	// 		if (!users) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed at getting Users');

	// 		return ResponseBuilder.ok({ users });
	// 	} catch (err) {
	// 		return ResponseBuilder.internalServerError(err, err.message);
	// 	}
	// }

	// public getUserById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
	// 	if (!event.pathParameters || !event.pathParameters.userId) {
	// 		return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
	// 	}

	// 	const userId: string = event.pathParameters.userId;

	// 	try {
	// 		const user: User = await this.unitOfWork.Users.getById(userId);
	// 		if (!user) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'User Not found');

	// 		return ResponseBuilder.ok({ user });
	// 	} catch (err) {
	// 		return ResponseBuilder.internalServerError(err, err.message);
	// 	}
	// }

	// public createUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
	// 	if (!event.body) {
	// 		return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
	// 	}
	// 	const user: Partial<User> = JSON.parse(event.body) as Partial<User>;

	// 	try {
	// 		const result: User = await this.unitOfWork.Users.create({ ...user });
	// 		if (!result) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'failed to create new user');

	// 		return ResponseBuilder.ok({ user: result });
	// 	} catch (err) {
	// 		return ResponseBuilder.internalServerError(err, err.message);
	// 	}
	// }

	// public updateUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
	// 	if (!event.body) {
	// 		return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
	// 	}

	// 	const user: Partial<User> = JSON.parse(event.body) as Partial<User>;

	// 	try {
	// 		const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
	// 		const result: User = await this.unitOfWork.Users.update(userId, { ...user });
	// 		if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'User not found');

	// 		return ResponseBuilder.ok({ user: result });
	// 	} catch (err) {
	// 		return ResponseBuilder.internalServerError(err, err.message);
	// 	}
	// }

	// public deleteUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
	// 	if (!event.pathParameters || !event.pathParameters.userId) {
	// 		return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
	// 	}

	// 	const userId: string = event.pathParameters.userId;

	// 	try {
	// 		const user: User = await this.unitOfWork.Users.delete(userId);
	// 		if (!user) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'User not found');

	// 		return ResponseBuilder.ok({ user });
	// 	} catch (err) {
	// 		return ResponseBuilder.internalServerError(err, err.message);
	// 	}
	// }

}
