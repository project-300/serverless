import { DriverBrief, Journey, Passenger, PassengerBrief } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork,
	SharedFunctions
} from '../../api-shared-modules/src';
import { CreateJourneyData } from './interfaces';

export class JourneyController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public getAllJourneys: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const journeys: Journey[] = await this.unitOfWork.Journeys.getAll();
			if (!journeys) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed at getting Journeys');

			return ResponseBuilder.ok({ journeys });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get journeys');
		}
	}

	public getJourneyById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;
		const createdAt: string = event.pathParameters.createdAt;

		try {
			SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);
			if (!journey) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok({ journey });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, 'Unable to get Journey');
		}
	}

	public createJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const data: CreateJourneyData = JSON.parse(event.body);

		if (!data.journey) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journey: Partial<Journey> = data.journey;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

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
			journey.searchText =
				`${journey.origin.name} ${journey.destination.name} ${journey.driver.firstName} ${journey.driver.lastName}`.toLowerCase();

			const result: Journey = await this.unitOfWork.Journeys.create({ ...journey });
			if (!result) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'Failed to create new Journey');

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to create a new Journey');
		}
	}

	public updateJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const journey: Partial<Journey> = JSON.parse(event.body);

		try {
			SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, journey.times.createdAt as string, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to update Journey');
		}
	}

	public deleteJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;
		const createdAt: string = event.pathParameters.createdAt;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);
			if (!journey) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');
			if (userId !== journey.driver.userId)
				return ResponseBuilder.forbidden(ErrorCode.MissingPermission, 'Only the creator / driver can delete a Journey');

			const result: Journey = await this.unitOfWork.Journeys.delete(journeyId, createdAt);
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	public addUserToJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		const data: { journeyId: string; createdAt: string } = JSON.parse(event.body);
		if (!data.journeyId || !data.createdAt) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const journey: Partial<Journey> =
				await this.unitOfWork.Journeys.getByIdWithProjection(
					data.journeyId,
					data.createdAt,
					[ 'journeyId', 'passengers', 'seatsLeft', 'driver', 'journeyStatus' ]
				);

			if (!journey) throw Error('Journey not found');
			if (journey.journeyStatus !== 'NOT_STARTED') throw Error('Unable to join journey - Journey has started');
			if (journey.seatsLeft <= 0) throw Error('Unable to join journey - No seats available');
			if (journey.passengers.find((p: PassengerBrief) => p.userId === userId))
				throw Error('Unable to join journey - User is already a passenger');
			if (journey.driver.userId === userId) throw Error('You cannot join your own journey');

			const passengerBrief: PassengerBrief = {
				...await this.unitOfWork.Users.getUserBrief(userId),
				driverConfirmedPickup: false,
				passengerConfirmedPickup: false,
				times: {
					joinedAt: new Date().toISOString()
				}
			};

			const passenger: Passenger = await this.unitOfWork.Users.getById(userId);

			this._addPassenger(journey, passengerBrief);
			this._addJourneyToPassenger(journey.journeyId, passenger);
			this._updateSeatCount(journey, -1);

			await this.unitOfWork.Users.update(passenger.userId, { ...passenger });
			const result: Journey = await this.unitOfWork.Journeys.update(data.journeyId, data.createdAt, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to add user to Journey');
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
		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const journeys: Journey[] = await this.unitOfWork.Journeys.getUserJourneys(userId);
			if (!journeys) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Journeys');

			return ResponseBuilder.ok({ journeys });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to retrieve Journeys');
		}
	}

	public getPassengerJourneys: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const passenger: Passenger = await this.unitOfWork.Users.getById(userId);
			if (!passenger) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'User does not exist');
			if (!passenger.journeysAsPassenger) return ResponseBuilder.ok([ ]); // Return empty array - No journeys yet

			const journeys: Journey[] = await this.unitOfWork.Journeys.getJourneysWithIds(passenger.journeysAsPassenger);
			if (!journeys) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Journeys');

			return ResponseBuilder.ok({ journeys });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to retrieve Journeys');
		}
	}

	public startJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;
		const createdAt: string = event.pathParameters.createdAt;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const journey: Partial<Journey> = await this.unitOfWork.Journeys.getById(journeyId, createdAt);

			if (userId !== journey.driver.userId)
				return ResponseBuilder.forbidden(ErrorCode.MissingPermission, 'Only the driver can start the Journey');

			if (journey.journeyStatus === 'STARTED' || journey.journeyStatus === 'ARRIVED') throw Error('Journey has already started');
			if (journey.journeyStatus === 'FINISHED') throw Error('Journey has already been complete');
			if (journey.journeyStatus === 'CANCELLED') throw Error('Journey has been cancelled');

			const date: string = new Date().toISOString();

			journey.journeyStatus = 'STARTED';
			journey.times.startedAt = date;
			journey.times.updatedAt = date;

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to start Journey');
		}
	}

	public endJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;
		const createdAt: string = event.pathParameters.createdAt;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const journey: Partial<Journey> = await this.unitOfWork.Journeys.getById(journeyId, createdAt);

			if (userId !== journey.driver.userId)
				return ResponseBuilder.forbidden(ErrorCode.MissingPermission, 'Only the driver can end the Journey');

			if (journey.journeyStatus === 'NOT_STARTED') throw Error('Journey has not been started');
			if (journey.journeyStatus === 'FINISHED') throw Error('Journey has already been complete');
			if (journey.journeyStatus === 'CANCELLED') throw Error('Journey has been cancelled');

			const date: string = new Date().toISOString();

			journey.journeyStatus = 'FINISHED';
			journey.times.endedAt = date;
			journey.times.updatedAt = date;

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to end Journey');
		}
	}

	public cancelPassengerAcceptedJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const { journeyId, createdAt }: { journeyId: string; createdAt: string } = JSON.parse(event.body);

		if (!journeyId || !createdAt) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);
			const passenger: Passenger = await this.unitOfWork.Users.getById(userId);

			this._removePassengerFromJourney(journey, passenger.userId);
			this._removeJourneyFromUser(journey.journeyId, passenger);

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
			await this.unitOfWork.Users.update(passenger.userId, { ...passenger });

			return ResponseBuilder.ok({ journey: result });
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

	public searchJourneys: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.query)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const query: string = event.pathParameters.query;

		try {
			SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const journeys: Journey[] = await this.unitOfWork.Journeys.searchJourneys(query);
			if (!journeys) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to search Journeys');

			return ResponseBuilder.ok({ journeys });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, 'Unable to search journeys');
		}
	}

}
