import { Statistics } from './../../api-shared-modules/src/utils/statistics';
import {
	DriverBrief,
	Journey,
	Passenger,
	PassengerBrief,
	GetMidpoint,
	User,
	DayStatistics,
	UserStatistics
} from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork,
	SharedFunctions,
	JourneyItem
} from '../../api-shared-modules/src';
import { CreateJourneyData } from './interfaces';
import _ from 'lodash';

export class JourneyController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public getAllJourneys: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		let lastEvaluatedKey: { [key: string]: string };

		if (event.queryStringParameters && event.queryStringParameters.pk && event.queryStringParameters.sk) {
			lastEvaluatedKey = {
				pk: `journey#${event.queryStringParameters.pk}`,
				sk: `createdAt#${event.queryStringParameters.sk}`,
				entity: 'journey'
			};
		}

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const result: { journeys: Journey[]; lastEvaluatedKey: Partial<JourneyItem> } =
				await this.unitOfWork.Journeys.getAll(lastEvaluatedKey);
			if (!result) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'to retrieve Journeys');

			result.journeys = await this._setJourneyFlags(userId, result.journeys);
			result.journeys = result.journeys.map((j: Journey) => {
				j.readableDurations = SharedFunctions.TimeDurations(j.times);
				return j;
			});

			return ResponseBuilder.ok({ ...result, count: result.journeys.length });
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
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			let journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);
			if (!journey) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			journey.readableDurations = SharedFunctions.TimeDurations(journey.times);
			journey = (await this._setJourneyFlags(userId, [ journey ]))[0];

			return ResponseBuilder.ok({ journey });
		} catch (err) {
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

			journey.midpoint = GetMidpoint(journey.origin, journey.destination);
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

			delete journey.sk2;
			delete journey.sk3;

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
					[ 'journeyId', 'passengers', 'seatsLeft', 'driver', 'journeyStatus', 'times', 'totalNoOfSeats' ]
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
			this._addJourneyToPassenger(journey, passenger);
			this._updateSeatCount(journey);

			await this.unitOfWork.Users.update(passenger.userId, { ...passenger });
			let result: Journey = await this.unitOfWork.Journeys.update(data.journeyId, data.createdAt, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			result.readableDurations = SharedFunctions.TimeDurations(result.times);
			result = (await this._setJourneyFlags(userId, [ result ]))[0];

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to add user to Journey');
		}
	}

	private _addPassenger = (journey: Partial<Journey>, passenger: PassengerBrief): void => {
		journey.passengers ? journey.passengers.push(passenger) : journey.passengers = [ passenger ];
	}

	private _addJourneyToPassenger = (journey: Partial<Journey>, passenger: Passenger): void => {
		const j: { journeyId: string; createdAt: string } = { journeyId: journey.journeyId, createdAt: journey.times.createdAt as string };

		passenger.journeysAsPassenger ?
			passenger.journeysAsPassenger.push(j) :
			passenger.journeysAsPassenger = [ j ];
	}

	private _updateSeatCount = (journey: Partial<Journey>): void => {
		journey.seatsLeft = journey.totalNoOfSeats - journey.passengers.length;
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

			const journeys: Journey[] = await this.unitOfWork.Journeys.getJourneysWithIds(passenger.journeysAsPassenger.map(
				(j: { journeyId: string; createdAt: string }) => j.journeyId)
			);
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

			result.readableDurations = SharedFunctions.TimeDurations(result.times);

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
			const user: User = await this.unitOfWork.Users.getById(userId);

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

			await this._handleStatistics(journey.distanceTravelled, user.university.universityId, journey);

			result.readableDurations = SharedFunctions.TimeDurations(result.times);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to end Journey');
		}
	}

	private _handleStatistics = async (distanceTravelled: number, universityId: string, journey: Partial<Journey>): Promise<void> => {
		const date: string = new Date().toISOString().split('T')[0];

		const newStats: Partial<DayStatistics> = Statistics.calcStatistics(distanceTravelled, journey.driver.userId, journey.passengers);
		const todaysStats: DayStatistics = await this.unitOfWork.Statistics.getForToday(date, universityId);

		newStats.passengers.forEach((p: UserStatistics) => {
			todaysStats.passengers.push(p);
		});

		todaysStats.drivers.push(newStats.drivers[0]);

		todaysStats.distance += newStats.distance;
		todaysStats.fuel += newStats.fuel;
		todaysStats.emissions += newStats.emissions;

		const statsId: string = todaysStats.pk.split('#')[1];

		await this.unitOfWork.Statistics.update(statsId, universityId, date, todaysStats);
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
			this._updateSeatCount(journey);

			delete journey.sk2; // Remove extra indexes to allow update to work
			delete journey.sk3;

			let result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
			await this.unitOfWork.Users.update(passenger.userId, { ...passenger });

			result.readableDurations = SharedFunctions.TimeDurations(result.times);
			result = (await this._setJourneyFlags(userId, [ result ]))[0];

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
		const index: number = passenger.journeysAsPassenger.findIndex(
			(j: { journeyId: string; createdAt: string }) => j.journeyId === journeyId
		);
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

		let lastEvaluatedKey: { [key: string]: string };

		if (event.queryStringParameters && event.queryStringParameters.pk && event.queryStringParameters.sk) {
			lastEvaluatedKey = {
				pk: `journey#${event.queryStringParameters.pk}`,
				sk: `createdAt#${event.queryStringParameters.sk}`,
				entity: 'journey'
			};
		}

		const query: string = event.pathParameters.query;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const result: { journeys: Journey[]; lastEvaluatedKey: Partial<JourneyItem>} =
				await this.unitOfWork.Journeys.searchJourneys(query, lastEvaluatedKey);
			if (!result) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to search Journeys');

			result.journeys = await this._setJourneyFlags(userId, result.journeys);
			result.journeys = result.journeys.map((j: Journey) => {
				j.readableDurations = SharedFunctions.TimeDurations(j.times);
				return j;
			});

			return ResponseBuilder.ok({ ...result, count: result.journeys.length });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to search journeys');
		}
	}

	private _setJourneyFlags = async (userId: string, journeys: Journey[]): Promise<Journey[]> => {
		const user: Partial<User> = await this.unitOfWork.Users.getJourneysAsPassenger(userId);

		return journeys.map(
			(j: Journey) => {
				const updatedJourney: Journey = _.find(user.journeysAsPassenger, { journeyId: j.journeyId }) ? { ...j, userJoined: true } : j;
				if (updatedJourney.driver.userId === userId) updatedJourney.isOwnedByUser = true;
				return updatedJourney;
			}
		);
	}

}
