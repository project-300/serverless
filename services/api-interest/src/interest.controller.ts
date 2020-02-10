import { Interest } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork
  } from '../../api-shared-modules/src';
import { InterestData } from './interfaces';

export class InterestController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public getAllInterestsRaw: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const interests: Interest[] = await this.unitOfWork.Interests.getAll();
			if (!interests) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Interests');

			return ResponseBuilder.ok({ interests });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to retrieve Interests');
		}
	}

	public getAllInterestsList: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const interests: Interest[] = await this.unitOfWork.Interests.getAll();
			if (!interests) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Interests');

			const interestsList: string[] = interests.map((interest: Interest) => interest.name);

			return ResponseBuilder.ok({ interests: interestsList });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to retrieve Interests');
		}
	}

	public getInterestById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.interestId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const interestId: string = event.pathParameters.interestId;

		try {
			const interest: Interest = await this.unitOfWork.Interests.getById(interestId);
			if (!interest) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Interest Not Found');

			return ResponseBuilder.ok({ interest });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get Interest');
		}
	}

	public createInterest: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const data: InterestData = JSON.parse(event.body);

		if (!data.interest) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const interest: Partial<Interest> = data.interest;

		try {
			if (!interest.name) throw Error('Interest name is missing');

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

			const interestCheck: Interest = await this.unitOfWork.Interests.getById(interest.interestId);
			if (!interestCheck) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			const result: Interest = await this.unitOfWork.Interests.update(interest.interestId, { ...interest });
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
			const result: Interest = await this.unitOfWork.Interests.delete(interestId);
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok({ interest: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

}
