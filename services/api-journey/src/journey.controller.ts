import { Journey } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork
  } from '../../api-shared-modules/src';

export class JourneyController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public getAllJourneys: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const journeys: Journey[] = await this.unitOfWork.Journeys.getAll();
			if (!journeys) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed at getting Journeys');

			return ResponseBuilder.ok(journeys);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get journeys');
		}
	}

	public getJourneyById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;

		try {
			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId);
			if (!journey) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok(journey);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get Journey');
		}
	}

	public createJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		const journey: Partial<Journey> = JSON.parse(event.body);

		try {
			const result: Journey = await this.unitOfWork.Journeys.create({ ...journey });
			if (!result) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'Failed to create new Journey');

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to create a new Journey');
		}
	}

	public updateJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const journey: Partial<Journey> = JSON.parse(event.body);

		try {
			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to update Journey');
		}
	}

	public deleteJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;

		try {
			const result: Journey = await this.unitOfWork.Journeys.delete(journeyId);
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

}
