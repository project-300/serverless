import { DriverBrief, Journey, Passenger, PassengerBrief } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork
  } from '../../api-shared-modules/src';
import _ from 'lodash';
import { CreateJourneyData } from '../../../src/functions/driver/journeys/journeys.interfaces';

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

		const data: CreateJourneyData = JSON.parse(event.body);

		if (!data.journey || !data.userId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journey: Partial<Journey> = data.journey;
		const userId: string = data.userId;

		try {
			if (!journey.totalNoOfSeats) throw Error('Journey seat count is missing');
			if (!journey.destination) throw Error('Journey destination is missing');
			if (!journey.origin) throw Error('Journey origin is missing');
			if (journey.pricePerSeat === undefined) throw Error('Journey seat price is missing');
			if (!journey.plannedRoute) throw Error('Journey planned route is missing');
			if (!journey.times || !journey.times.leavingAt) throw Error('Journey start time is missing');

			const driver: DriverBrief = await this.unitOfWork.Users.getDriverBrief(userId);
			if (!driver) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'Driver not found');

			journey.driver = driver;
			journey.times.createdAt = new Date().toISOString();

			const result: Journey = await this.unitOfWork.Journeys.create({ ...journey });
			if (!result) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'Failed to create new Journey');

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to create a new Journey');
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

	public addUserToJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		const data: { journeyId: string; userId: string } = JSON.parse(event.body);
		if (!data.journeyId || !data.userId) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		try {
			const journey: Partial<Journey> =
				await this.unitOfWork.Journeys.getByIdWithProjection(
					data.journeyId,
					[ 'journeyId', 'passengers', 'seatsLeft', 'driver' ]
				);

			if (journey.journeyStatus !== 'NOT_STARTED') throw Error('Unable to join journey - Journey has started');
			if (journey.seatsLeft <= 0) throw Error('Unable to join journey - No seats available');
			if (journey.passengers.find((p: PassengerBrief) => p.userId === data.userId))
				throw Error('Unable to join journey - User is already a passenger');

			const passengerBrief: PassengerBrief = {
				...await this.unitOfWork.Users.getUserBrief(data.userId),
				driverConfirmedPickup: false,
				passengerConfirmedPickup: false
			};

			const passenger: Passenger = await this.unitOfWork.Users.getById(data.userId);

			this._addPassenger(journey, passengerBrief);
			this._addJourneyToPassenger(journey.journeyId, passenger);
			this._updateSeatCount(journey, -1);

			await this.unitOfWork.Users.update(passenger.userId, { ...passenger });
			const result: Journey = await this.unitOfWork.Journeys.update(data.journeyId, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to add user to Journey');
		}
	}

	private _addPassenger = (journey: Partial<Journey>, passenger: PassengerBrief): void => {
		journey.passengers ? journey.passengers.push(passenger) : journey.passengers = [ passenger ];
	}

	private _addJourneyToPassenger = (journeyId: string, passenger: Passenger): void => {
		passenger.journeysAsPassenger ? passenger.journeysAsPassenger.push(journeyId) : passenger.journeysAsPassenger = [ journeyId ];
	}

	private _updateSeatCount = (journey: Partial<Journey>, count: number): void => {
		journey.seatsLeft += count;
	}

	public getDriverJourneys: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.userId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		try {
			const journeys: Journey[] = await this.unitOfWork.Journeys.getAll();
			if (!journeys) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Journeys');

			// Update to filter by driver - Waiting for new index

			return ResponseBuilder.ok(journeys);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to retrieve Journeys');
		}
	}

	public getPassengerJourneys: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.userId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		try {
			const journeys: Journey[] = await this.unitOfWork.Journeys.getAll();
			if (!journeys) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Journeys');

			// Update to filter by passenger - Waiting for new index

			return ResponseBuilder.ok(journeys);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to retrieve Journeys');
		}
	}

	public startJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journey: Partial<Journey> = await this.unitOfWork.Journeys.getById(event.pathParameters.journeyId);

		try {
			if (journey.journeyStatus === 'STARTED' || journey.journeyStatus === 'ARRIVED') throw Error('Journey has already started');
			if (journey.journeyStatus === 'FINISHED') throw Error('Journey has already been complete');
			if (journey.journeyStatus === 'CANCELLED') throw Error('Journey has been cancelled');

			const date: string = new Date().toISOString();

			journey.journeyStatus = 'STARTED';
			journey.times.startedAt = date;
			journey.times.updatedAt = date;

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to start Journey');
		}
	}

	public endJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journey: Partial<Journey> = await this.unitOfWork.Journeys.getById(event.pathParameters.journeyId);

		try {
			if (journey.journeyStatus === 'NOT_STARTED') throw Error('Journey has not been started');
			if (journey.journeyStatus === 'FINISHED') throw Error('Journey has already been complete');
			if (journey.journeyStatus === 'CANCELLED') throw Error('Journey has been cancelled');

			const date: string = new Date().toISOString();

			journey.journeyStatus = 'FINISHED';
			journey.times.endedAt = date;
			journey.times.updatedAt = date;

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to end Journey');
		}
	}

	public cancelPassengerAcceptedJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		// To be updated - UserId will come from token or context
		const { journeyId, userId }: { journeyId: string; userId: string } = JSON.parse(event.body);

		if (!journeyId || !userId) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		try {
			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId);
			const passenger: Passenger = await this.unitOfWork.Users.getById(userId);

			this._removePassengerFromJourney(journey, passenger.userId);
			this._removeJourneyFromUser(journey.journeyId, passenger);

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, { ...journey });
			await this.unitOfWork.Users.update(passenger.userId, { ...passenger });

			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to end Journey');
		}
	}

	private _removePassengerFromJourney = (journey: Journey, userId: string): void => {
		const index: number = journey.passengers.findIndex((p: PassengerBrief) => p.userId === userId);
		journey.passengers.splice(index, 1);
	}

	private _removeJourneyFromUser = (journeyId: string, passenger: Passenger): void => {
		const index: number = passenger.journeysAsPassenger.findIndex((j: string) => j === journeyId);
		passenger.journeysAsPassenger.splice(index, 1);
	}

	// public driverMovement: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
	//
	// }
	//
	// public subscribeDriverLocation: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
	//
	// }

}
