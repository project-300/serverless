import { Interest, University, User } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork, SharedFunctions
} from '../../api-shared-modules/src';
import { InterestData } from './interfaces';

export class InterestController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public getAllInterestsRawByUniversity: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Moderator' ], user.userType);

			if (!user.university) throw Error('You are not associated with any university');

			const university: University = await this.unitOfWork.Universities.getById(user.university.universityId, user.university.name);
			if (!university) throw Error('You are not associated with a valid university');

			const interests: Interest[] = await this.unitOfWork.Interests.getAll(user.university.universityId);
			if (!interests) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Interests');

			return ResponseBuilder.ok({ interests });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to retrieve Interests');
		}
	}

	public getAllInterestsListByUniversity: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);

			if (!user.university) throw Error('You are not associated with any university');

			const university: University = await this.unitOfWork.Universities.getById(user.university.universityId, user.university.name);
			if (!university) throw Error('You are not associated with a valid university');

			const interests: Interest[] = await this.unitOfWork.Interests.getAll(user.university.universityId);
			if (!interests) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Interests');

			const interestsList: string[] = interests.map((interest: Interest) => interest.name);

			return ResponseBuilder.ok({ interests: interestsList });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to retrieve Interests');
		}
	}

	public getInterestById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.interestId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const interestId: string = event.pathParameters.interestId;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Moderator' ], user.userType);

			const interest: Interest = await this.unitOfWork.Interests.getById(interestId, user.university.universityId);
			if (!interest) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Interest Not Found');

			return ResponseBuilder.ok({ interest });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to get Interest');
		}
	}

	public createInterest: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const data: InterestData = JSON.parse(event.body);

		if (!data.interest) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const interest: Partial<Interest> = data.interest;

		try {
			if (!interest.name) throw Error('Interest name is missing');

			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Moderator' ], user.userType);

			if (!user.university) throw Error('You are not associated with any university');

			const university: University = await this.unitOfWork.Universities.getById(user.university.universityId, user.university.name);
			if (!university) throw Error('You are not associated with a valid university');

			const existingInterest: Interest = await this.unitOfWork.Interests.getByName(interest.name, user.university.universityId);
			if (existingInterest) throw Error('This interest has already been created');

			interest.universityId = user.university.universityId;

			const result: Interest = await this.unitOfWork.Interests.create({ ...interest });
			if (!result) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'Failed to create new Interest');

			return ResponseBuilder.ok({ interest: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to create a new Interest');
		}
	}

	public updateInterest: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const data: InterestData = JSON.parse(event.body);

		if (!data.interest) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const interest: Partial<Interest> = data.interest;

		try {
			if (!interest.interestId) throw Error('Interest ID is missing');

			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Moderator' ], user.userType);

			const interestCheck: Interest = await this.unitOfWork.Interests.getById(interest.interestId, user.university.universityId);
			if (!interestCheck) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Interest Not Found');

			const result: Interest = await this.unitOfWork.Interests.update(interest.interestId, user.university.universityId, { ...interest });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Interest Not Found');

			return ResponseBuilder.ok({ interest: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to update Interest');
		}
	}

	public deleteInterest: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.interestId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const interestId: string = event.pathParameters.interestId;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Moderator' ], user.userType);

			const result: Interest = await this.unitOfWork.Interests.delete(interestId, user.university.universityId);
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Interest Not Found');

			return ResponseBuilder.ok({ interest: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

}
