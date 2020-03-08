import { University, User } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork, SharedFunctions
} from '../../api-shared-modules/src';
import { UniversityData } from './interfaces';

export class UniversityController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public getAllUniversities: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Admin' ], user.userType);

			const universities: University[] = await this.unitOfWork.Universities.getAll();
			if (!universities) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Universities');

			return ResponseBuilder.ok({ universities });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to retrieve Universities');
		}
	}

	public getUniversityById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.universityId || !event.pathParameters.universityName)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const universityId: string = event.pathParameters.universityId;
		const universityName: string = event.pathParameters.universityName;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Admin', 'Moderator' ], user.userType);

			const university: University = await this.unitOfWork.Universities.getById(universityId, universityName);
			if (!university) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'University Not Found');

			return ResponseBuilder.ok({ university });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get University');
		}
	}

	public getAllUniversityDomains: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const domains: string[] = await this.unitOfWork.Universities.getAllDomains();
			if (!domains) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve University email domains');

			return ResponseBuilder.ok({ domains });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get University email domains');
		}
	}

	public createUniversity: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const data: UniversityData = JSON.parse(event.body);

		if (!data.university) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const university: Partial<University> = data.university;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Admin' ], user.userType);

			if (!university.name) throw Error('University name is missing');
			if (!university.emailDomains) throw Error('University email domains are missing');
			if (!university.emailDomains.length) throw Error('University must have at least one email domain');

			const existingUniversity: University = await this.unitOfWork.Universities.getByName(university.name);
			if (existingUniversity) throw Error('A University with that name already exists');

			const result: University = await this.unitOfWork.Universities.create({ ...university });
			if (!result) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'Failed to create new University');

			return ResponseBuilder.ok({ university: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to create a new University');
		}
	}

	public updateUniversity: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const data: UniversityData = JSON.parse(event.body);

		if (!data.university) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const university: Partial<University> = data.university;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Admin' ], user.userType);

			if (!university.universityId) throw Error('University ID is missing');

			const universityCheck: University = await this.unitOfWork.Universities.getById(university.universityId, university.name);
			if (!universityCheck) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'University Not Found');

			const result: University = await this.unitOfWork.Universities.update(university.universityId, universityCheck.name, { ...university });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'University Not Found');

			return ResponseBuilder.ok({ university: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to update University');
		}
	}

	public deleteUniversity: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.universityId || !event.pathParameters.universityName)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const universityId: string = event.pathParameters.universityId;
		const universityName: string = event.pathParameters.universityName;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Admin' ], user.userType);

			const result: University = await this.unitOfWork.Universities.delete(universityId, universityName);
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'University Not Found');

			return ResponseBuilder.ok({ university: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

}
