import { University } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork
  } from '../../api-shared-modules/src';
import { UniversityData } from './interfaces';

export class InterestController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public getAllUniversities: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const universities: University[] = await this.unitOfWork.Universities.getAll();
			if (!universities) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Universities');

			return ResponseBuilder.ok({ universities });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to retrieve Universities');
		}
	}

	public getUniversityById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.universityId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const universityId: string = event.pathParameters.universityId;

		try {
			const university: University = await this.unitOfWork.Universities.getById(universityId);
			if (!university) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'University Not Found');

			return ResponseBuilder.ok({ university });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get University');
		}
	}

	public createUniversity: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const data: UniversityData = JSON.parse(event.body);

		if (!data.university) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const university: Partial<University> = data.university;

		try {
			if (!university.name) throw Error('University name is missing');

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
			if (!university.universityId) throw Error('University ID is missing');

			const universityCheck: University = await this.unitOfWork.Universities.getById(university.universityId);
			if (!universityCheck) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'University Not Found');

			const result: University = await this.unitOfWork.Universities.update(university.universityId, { ...university });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'University Not Found');

			return ResponseBuilder.ok({ university: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to update University');
		}
	}

	public deleteUniversity: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.universityId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const universityId: string = event.pathParameters.universityId;

		try {
			const result: University = await this.unitOfWork.Universities.delete(universityId);
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'University Not Found');

			return ResponseBuilder.ok({ university: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

}
