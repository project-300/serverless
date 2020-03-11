import { Statistics } from '../../api-shared-modules/src/utils/statistics';
import {
	DriverBrief,
	Journey,
	Passenger,
	PassengerBrief,
	GetMidpoint,
	User,
	Coords,
	UserConnection,
	PublishType, JourneyRating, UserBrief,
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
import SubscriptionManager from '../../api-websockets/src/pubsub/subscription';
import PublicationManager from '../../api-websockets/src/pubsub/publication';
import API from '../../api-websockets/src/lib/api';

export class JourneyController {

	private SubManager: SubscriptionManager;
	private PubManager: PublicationManager;

	public constructor(private unitOfWork: UnitOfWork) {
		this.SubManager = new SubscriptionManager(unitOfWork);
		this.PubManager = new PublicationManager(unitOfWork, new API());
	}

	public getAllJourneys: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		let lastEvaluatedKey: { [key: string]: string };

		if (event.queryStringParameters && event.queryStringParameters.pk && event.queryStringParameters.sk) {
			lastEvaluatedKey = {
				pk: `journey#${event.queryStringParameters.pk}`,
				sk: `createdAt#${event.queryStringParameters.sk}`,
				entity: 'journey'
			};
		}

		console.log(lastEvaluatedKey);

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
			console.log(err);
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

	public getCurrentJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.deviceId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const deviceId: string = event.pathParameters.deviceId;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);

			if (!user.currentJourney) return ResponseBuilder.ok({ });

			let journey: Journey = await this.unitOfWork.Journeys.getById(user.currentJourney.journeyId, user.currentJourney.createdAt);
			if (!journey) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			const isDriver: boolean = journey.driver.userId === userId;

			if (journey.journeyStatus === 'FINISHED' &&
				(isDriver || journey.ratings && journey.ratings.find((rating: JourneyRating) => rating.passenger.userId === userId))
			) {
				this._removeCurrentJourney(userId, journey.journeyId);
				return ResponseBuilder.ok({ });
			}

			journey.readableDurations = SharedFunctions.TimeDurations(journey.times);
			journey = (await this._setJourneyFlags(userId, [ journey ]))[0];

			const userWithConnections: Partial<User> = await this.unitOfWork.Users.getUserConnections(userId);
			const currentConnection: UserConnection =
				userWithConnections.connections && _.findLast(_.sortBy(userWithConnections.connections, [ 'connectedAt' ]),
															  (con: UserConnection) => con.deviceId === deviceId
				);

			await this.SubManager.subscribe({
				subscriptionName: 'journey/current',
				itemType: 'journey',
				itemId: journey.journeyId,
				connectionId: currentConnection.connectionId,
				deviceId,
				userId
			});

			let awaitingConfirmation: boolean = false;

			if (!isDriver) {
				await this.SubManager.subscribe({
					subscriptionName: 'journey/pickup-alerts',
					itemType: 'journey',
					itemId: journey.journeyId,
					connectionId: currentConnection.connectionId,
					deviceId,
					userId
				});

				const passenger: PassengerBrief = journey.passengers.find((p: PassengerBrief) => p.userId === userId);

				awaitingConfirmation = passenger.driverConfirmedPickup && !passenger.passengerConfirmedPickup && !passenger.passengerCancelledPickup;
			} else {
				await this.SubManager.subscribe({
					subscriptionName: 'journey/passenger-tracking',
					itemType: 'journey',
					itemId: journey.journeyId,
					connectionId: currentConnection.connectionId,
					deviceId,
					userId
				});
			}

			return ResponseBuilder.ok({ journey, travellingAs: user.currentJourney.travellingAs, awaitingConfirmation });
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
				driverCancelledPickup: false,
				passengerCancelledPickup: false,
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

	public beginJourneyPickup: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;
		const createdAt: string = event.pathParameters.createdAt;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Driver' ], user.userType);

			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);

			if (userId !== journey.driver.userId)
				return ResponseBuilder.forbidden(ErrorCode.MissingPermission, 'Only the driver can start the Journey pickup');

			if (
				journey.journeyStatus === 'STARTED' ||
				journey.journeyStatus === 'PAUSED' ||
				journey.journeyStatus === 'ARRIVED'
			) throw Error('Unable to begin pickup - Journey has already Started');
			if (journey.journeyStatus === 'FINISHED') throw Error('Unable to begin pickup - Journey has already Finished');
			if (journey.journeyStatus === 'CANCELLED') throw Error('Unable to begin pickup - Journey has been Cancelled');

			let result: Journey = journey;

			if (journey.journeyStatus !== 'PICKUP') {
				const date: string = new Date().toISOString();

				journey.journeyStatus = 'PICKUP';
				journey.times.startedPickupAt = date;
				journey.times.updatedAt = date;
				journey.actionLogs.push({ description: 'Began passenger pickup', time: date });

				result = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
				if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');
			}

			result.readableDurations = SharedFunctions.TimeDurations(result.times);

			await this._publishJourneyUpdate(result, userId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to begin pickup for Journey');
		}
	}

	public waitingJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;
		const createdAt: string = event.pathParameters.createdAt;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Driver' ], user.userType);

			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);

			if (userId !== journey.driver.userId)
				return ResponseBuilder.forbidden(ErrorCode.MissingPermission, 'Only the driver can update the Journey');

			if (journey.journeyStatus === 'CANCELLED') throw Error('Journey has been cancelled');
			if (journey.journeyStatus === 'FINISHED') throw Error('Journey has already ended');

			const date: string = new Date().toISOString();
			let result: Journey = journey;

			if (journey.journeyStatus === 'NOT_STARTED' || journey.journeyStatus === 'PICKUP') {
				journey.journeyStatus = 'WAITING';
				journey.times.waitingAt = date;
				journey.times.updatedAt = date;
				journey.actionLogs.push({ description: 'Waiting to start Journey', time: date });

				result = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
				if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Updated');
			}

			result.readableDurations = SharedFunctions.TimeDurations(result.times);

			await this._publishJourneyUpdate(result, userId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to update Journey');
		}
	}

	public startJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;
		const createdAt: string = event.pathParameters.createdAt;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Driver' ], user.userType);

			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);
			const { journeyStatus }: Partial<Journey> = journey;

			if (userId !== journey.driver.userId)
				return ResponseBuilder.forbidden(ErrorCode.MissingPermission, 'Only the driver can start the Journey');

			if (journeyStatus === 'STARTED' || journeyStatus === 'ARRIVED') return ResponseBuilder.ok({ journey });
			if (journeyStatus === 'FINISHED') throw Error('Journey has already been complete');
			if (journeyStatus === 'CANCELLED') throw Error('Journey has been cancelled');

			const date: string = new Date().toISOString();

			journey.journeyStatus = 'STARTED';
			journey.times.startedAt = date;
			journey.times.updatedAt = date;
			journey.actionLogs.push({ description: 'Started Journey', time: date });

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			result.readableDurations = SharedFunctions.TimeDurations(result.times);

			await this._publishJourneyUpdate(result, userId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to start Journey');
		}
	}

	public pauseJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;
		const createdAt: string = event.pathParameters.createdAt;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Driver' ], user.userType);

			const journey: Partial<Journey> = await this.unitOfWork.Journeys.getById(journeyId, createdAt);

			if (userId !== journey.driver.userId)
				return ResponseBuilder.forbidden(ErrorCode.MissingPermission, 'Only the driver can pause the Journey');

			if (journey.journeyStatus !== 'STARTED') throw Error('Journey isn\'t currently in progress');

			const date: string = new Date().toISOString();

			journey.journeyStatus = 'PAUSED';
			journey.times.pausedAt = date;
			journey.times.updatedAt = date;
			journey.actionLogs.push({ description: 'Paused Journey', time: date });

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			result.readableDurations = SharedFunctions.TimeDurations(result.times);

			await this._publishJourneyUpdate(result, userId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to pause Journey');
		}
	}

	public resumeJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;
		const createdAt: string = event.pathParameters.createdAt;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Driver' ], user.userType);

			const journey: Partial<Journey> = await this.unitOfWork.Journeys.getById(journeyId, createdAt);

			if (userId !== journey.driver.userId)
				return ResponseBuilder.forbidden(ErrorCode.MissingPermission, 'Only the driver can resume the Journey');

			if (journey.journeyStatus !== 'PAUSED') throw Error('Journey isn\'t currently paused');

			const date: string = new Date().toISOString();

			journey.journeyStatus = 'STARTED';
			journey.times.resumedAt = date;
			journey.times.updatedAt = date;
			journey.actionLogs.push({ description: 'Resumed Journey', time: date });

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			result.readableDurations = SharedFunctions.TimeDurations(result.times);

			await this._publishJourneyUpdate(result, userId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to resume Journey');
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
			SharedFunctions.checkUserRole([ 'Driver' ], user.userType);

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
			journey.available = false;
			journey.actionLogs.push({ description: 'Ended Journey', time: date });

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			await this._handleStatistics((journey.estimatedDistance / 1000) || 0, user.university.universityId, journey);

			result.readableDurations = SharedFunctions.TimeDurations(result.times);

			await this._removeCurrentJourney(journey.driver.userId, journey.journeyId);
			await this._publishJourneyUpdate(result, userId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to end Journey');
		}
	}

	private _removeCurrentJourney = async (userId: string, journeyId: string): Promise<void> => {
		const user: User = await this.unitOfWork.Users.getById(userId);
		if (!user) return;
		if (user.currentJourney && user.currentJourney.journeyId === journeyId) user.currentJourney = null;
		await this.unitOfWork.Users.update(userId, user);
	}

	public cancelJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.journeyId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const journeyId: string = event.pathParameters.journeyId;
		const createdAt: string = event.pathParameters.createdAt;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Driver' ], user.userType);

			const journey: Partial<Journey> = await this.unitOfWork.Journeys.getById(journeyId, createdAt);

			if (userId !== journey.driver.userId)
				return ResponseBuilder.forbidden(ErrorCode.MissingPermission, 'Only the driver can cancel the Journey');

			if (journey.journeyStatus === 'CANCELLED') throw Error('Journey has already been Cancelled');
			if (journey.journeyStatus === 'FINISHED') throw Error('Unable to Cancel - Journey has Finished');
			if (journey.journeyStatus !== 'NOT_STARTED') throw Error('Unable to Cancel - Journey has already Started');

			const date: string = new Date().toISOString();

			journey.journeyStatus = 'CANCELLED';
			journey.times.cancelledAt = date;
			journey.times.updatedAt = date;
			journey.available = false;
			journey.actionLogs.push({ description: 'Cancelled Journey', time: date });

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			result.readableDurations = SharedFunctions.TimeDurations(result.times);

			await this._publishJourneyUpdate(result, userId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to cancel Journey');
		}
	}

	private _handleStatistics = async (distanceTravelled: number = 0, universityId: string, journey: Partial<Journey>): Promise<void> => {
		const date: string = new Date().toISOString().split('T')[0];

		try {
			const newStats: Partial<DayStatistics> = Statistics.calcStatistics(distanceTravelled, journey.driver.userId, journey.passengers);
			const todaysStats: DayStatistics = await this.unitOfWork.Statistics.getForToday(date, universityId);

			if (todaysStats) {
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

			await Promise.all(newStats.passengers.map(async (p: UserStatistics) => {
				const passenger: Partial<User> = await this.unitOfWork.Users.getUserStats(p.userId);

				if (!passenger.statistics) passenger.statistics = {
					distance: 0,
					emissions: 0,
					fuel: 0,
					liftsGiven: 0,
					liftsTaken: 0
				};

				passenger.statistics.distance = (passenger.statistics.distance || 0) + p.distance;
				passenger.statistics.emissions = (passenger.statistics.emissions || 0) + p.emissions;
				passenger.statistics.fuel = (passenger.statistics.fuel || 0) + p.fuel;
				passenger.statistics.liftsTaken = (passenger.statistics.liftsTaken || 0) + 1;

				await this.unitOfWork.Users.update(passenger.userId, passenger);
			}));

			await Promise.all(newStats.drivers.map(async (d: UserStatistics) => {
				const driver: Partial<User> = await this.unitOfWork.Users.getUserStats(d.userId);

				if (!driver.statistics) driver.statistics = {
					distance: 0,
					emissions: 0,
					fuel: 0,
					liftsGiven: 0,
					liftsTaken: 0
				};

				driver.statistics.distance = (driver.statistics.distance || 0) + d.distance;
				driver.statistics.emissions = (driver.statistics.emissions || 0) + d.emissions;
				driver.statistics.fuel = (driver.statistics.fuel || 0) + d.fuel;
				driver.statistics.liftsGiven = (driver.statistics.liftsGiven || 0) + 1;

				await this.unitOfWork.Users.update(driver.userId, driver);
			}));

			const currentJourney: Journey = await this.unitOfWork.Journeys.getById(journey.journeyId, journey.times.createdAt);
			if (!currentJourney.statistics) currentJourney.statistics = {
				emissions: 0,
				distance: 0,
				fuel: 0
			};

			currentJourney.statistics.emissions = currentJourney.statistics.emissions + (newStats.drivers[0].emissions / journey.passengers.length);
			currentJourney.statistics.distance = currentJourney.statistics.distance + (newStats.drivers[0].distance / journey.passengers.length);
			currentJourney.statistics.fuel = currentJourney.statistics.fuel + (newStats.drivers[0].fuel / journey.passengers.length);

			await this.unitOfWork.Journeys.update(journey.journeyId, journey.times.createdAt, currentJourney);
		} catch (err) {
			console.log(err);
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

	public driverMovement: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		const data: { journeyId: string; createdAt: string; coords: Coords } = JSON.parse(event.body);
		if (!data.journeyId || !data.createdAt || !data.coords) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const { journeyId, createdAt, coords }: { journeyId: string; createdAt: string; coords: Coords } = data;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const journey: Journey = await this.unitOfWork.Journeys.getById(data.journeyId, data.createdAt);
			if (!journey) throw Error('Journey not found');

			if (journey.journeyStatus !== 'STARTED') throw Error('Unable to update journey - Journey has not started');
			if (journey.driver.userId !== userId) throw Error('You cannot update another user\'s journey');

			journey.routeTravelled.push(coords);
			journey.times.updatedAt = new Date().toISOString();

			await this.unitOfWork.Journeys.update(journeyId, createdAt, journey);

			await this.PubManager.publishCRUD({
				subscriptionName: 'journey/driver-tracking',
				itemType: 'journey',
				itemId: journeyId,
				data: { journeyId, coords },
				sendAsCollection: true,
				publishType: PublishType.UPDATE
			});

			return ResponseBuilder.ok({ journey });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to add user to Journey');
		}
	}

	public locationMovement: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		const data: { coords: Coords } = JSON.parse(event.body);
		if (!data.coords) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const { coords }: { coords: Coords } = data;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			const { currentJourney }: Partial<User> = user;

			if (!currentJourney) ResponseBuilder.ok({ });

			const journey: Journey = await this.unitOfWork.Journeys.getById(currentJourney.journeyId, currentJourney.createdAt);
			if (!journey) throw Error('Journey not found');
			const { journeyId, passengers}: Partial<Journey> = journey;

			if (journey.driver.userId === userId) {	// User is the driver
				// if (journey.journeyStatus !== 'WAITING') throw Error('Unable to update journey - Journey has not started');

				// journey.routeTravelled.push(coords);
				// journey.times.updatedAt = new Date().toISOString();

				// await this.unitOfWork.Journeys.update(journeyId, createdAt, journey);
				await this._publishDriverLocation(journeyId, coords);
			} else if (passengers.map((p: PassengerBrief) => p.userId).find((p: string) => p === userId)) { // User is a passenger
				this._publishPassengerLocation(journeyId, userId, coords);
			}

			return ResponseBuilder.ok({ journey });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to add user to Journey');
		}
	}

	public subscribeDriverLocation: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		const data: { journeyId: string; createdAt: string; deviceId: string } = JSON.parse(event.body);
		if (!data.journeyId || !data.createdAt || !data.deviceId) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const { journeyId, createdAt, deviceId }: { journeyId: string; createdAt: string; deviceId: string } = data;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const user: User = await this.unitOfWork.Users.getById(userId);
			if (!user) throw Error('User not found');

			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);
			if (!journey) throw Error('Journey not found');

			const userWithConnections: Partial<User> = await this.unitOfWork.Users.getUserConnections(userId);
			const currentConnection: UserConnection =
				userWithConnections.connections && _.findLast(_.sortBy(userWithConnections.connections, [ 'connectedAt' ]),
					(con: UserConnection) => con.deviceId === deviceId
				);

			await this.SubManager.subscribe({
				subscriptionName: 'journey/driver-tracking',
				itemType: 'journey',
				itemId: journeyId,
				connectionId: currentConnection.connectionId,
				deviceId,
				userId: user.userId
			});

			return ResponseBuilder.ok({ });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to add user to Journey');
		}
	}

	public unsubscribeDriverLocation: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		const data: { journeyId: string; deviceId: string } = JSON.parse(event.body);
		if (!data.journeyId || !data.deviceId) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const { journeyId, deviceId }: { journeyId: string; deviceId: string } = data;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const userWithConnections: Partial<User> = await this.unitOfWork.Users.getUserConnections(userId);
			const currentConnection: UserConnection =
				userWithConnections.connections && _.findLast(_.sortBy(userWithConnections.connections, [ 'connectedAt' ]),
					(con: UserConnection) => con.deviceId === deviceId
				);

			await this.SubManager.unsubscribe({
				subscriptionName: 'journey/driver-tracking',
				itemType: 'journey',
				itemId: journeyId,
				connectionId: currentConnection.connectionId,
				deviceId,
				userId
			});

			return ResponseBuilder.ok({ });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to add user to Journey');
		}
	}

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
			console.log(err);
			return ResponseBuilder.internalServerError(err, 'Unable to search journeys');
		}
	}

	public driverConfirmPassengerPickup: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const { journeyId, createdAt, passengerId }: { journeyId: string; createdAt: string; passengerId: string } = JSON.parse(event.body);

		if (!journeyId || !createdAt || !passengerId) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Driver' ], user.userType);

			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);
			if (!journey) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey not found');

			const passenger: PassengerBrief = journey.passengers.find((p: PassengerBrief) => p.userId === passengerId);
			if (!passenger) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Passenger not found');

			const date: string = new Date().toISOString();

			passenger.driverConfirmedPickup = true;
			passenger.driverCancelledPickup = false;
			passenger.times.driverConfirmPickUpAt = date;

			journey.actionLogs.push({ description: `${user.firstName} confirmed pickup for ${passenger.firstName}`, time: date });

			const result: Journey = await this.unitOfWork.Journeys.update(journeyId, createdAt, journey);
			if (!result) throw Error('Unable to Update Journey');

			await this._publishJourneyUpdate(result, userId);
			await this._publishPickupAlert(result, passengerId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to update passenger pickup status');
		}
	}

	public passengerConfirmPickup: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const { journeyId, createdAt }: { journeyId: string; createdAt: string } = JSON.parse(event.body);

		if (!journeyId || !createdAt) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			if (!user) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'User not found');

			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);
			if (!journey) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey not found');

			const passenger: PassengerBrief = journey.passengers.find((p: PassengerBrief) => p.userId === userId);
			if (!passenger) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Passenger not found');

			const date: string = new Date().toISOString();

			passenger.passengerConfirmedPickup = true;
			passenger.passengerCancelledPickup = false;
			passenger.times.passengerConfirmPickUpAt = date;

			journey.actionLogs.push({ description: `${passenger.firstName} confirmed their pickup`, time: date });

			const result: Journey = await this.unitOfWork.Journeys.update(journeyId, createdAt, journey);
			if (!result) throw Error('Unable to Update Journey');

			await this._publishJourneyUpdate(result, userId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to update pickup status');
		}
	}

	public driverCancelPassengerPickup: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const { journeyId, createdAt, passengerId }: { journeyId: string; createdAt: string; passengerId: string } = JSON.parse(event.body);

		if (!journeyId || !createdAt || !passengerId) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Driver' ], user.userType);

			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);
			if (!journey) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey not found');

			const passenger: PassengerBrief = journey.passengers.find((p: PassengerBrief) => p.userId === passengerId);
			if (!passenger) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Passenger not found');

			const date: string = new Date().toISOString();

			passenger.driverCancelledPickup = true;
			passenger.driverConfirmedPickup = false;
			passenger.times.driverCancelPickUpAt = date;

			journey.actionLogs.push({ description: `${user.firstName} cancelled pickup for ${passenger.firstName}`, time: date });

			const result: Journey = await this.unitOfWork.Journeys.update(journeyId, createdAt, journey);
			if (!result) throw Error('Unable to Update Journey');

			await this._publishJourneyUpdate(result, userId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to cancel passenger pickup');
		}
	}

	public passengerCancelPickup: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const { journeyId, createdAt }: { journeyId: string; createdAt: string } = JSON.parse(event.body);

		if (!journeyId || !createdAt) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: User = await this.unitOfWork.Users.getById(userId);
			SharedFunctions.checkUserRole([ 'Driver' ], user.userType);

			const journey: Journey = await this.unitOfWork.Journeys.getById(journeyId, createdAt);
			if (!journey) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey not found');

			const passenger: PassengerBrief = journey.passengers.find((p: PassengerBrief) => p.userId === userId);
			if (!passenger) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Passenger not found');

			const date: string = new Date().toISOString();

			passenger.passengerCancelledPickup = true;
			passenger.passengerConfirmedPickup = false;
			passenger.times.passengerCancelPickUpAt = date;

			journey.actionLogs.push({ description: `${passenger.firstName} cancelled their pickup`, time: date });

			const result: Journey = await this.unitOfWork.Journeys.update(journeyId, createdAt, journey);
			if (!result) throw Error('Unable to Update Journey');

			await this._publishJourneyUpdate(result, userId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to cancel pickup');
		}
	}

	public rateJourney: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const { journeyId, createdAt, rating }: { journeyId: string; createdAt: string; rating: number } = JSON.parse(event.body);

		if (!journeyId || !createdAt || !rating) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);
			const user: UserBrief = await this.unitOfWork.Users.getUserBrief(userId);

			const journey: Partial<Journey> = await this.unitOfWork.Journeys.getById(journeyId, createdAt);

			if (journey.driver.userId === userId)
				return ResponseBuilder.forbidden(ErrorCode.MissingPermission, 'A driver cannot rate their own Journey');
			if (!journey.passengers.find((p: PassengerBrief) => p.userId === userId))
				return ResponseBuilder.forbidden(ErrorCode.MissingPermission, 'Only a passenger on this v can submit a Rating');

			if (journey.journeyStatus !== 'FINISHED') throw Error('Journey has not finished yet');

			const driver: User = await this.unitOfWork.Users.getById(journey.driver.userId);
			if (!driver) throw Error('Driver does not exist');

			const sumOfRatings: number = (driver.averageRating * driver.totalRatings) + rating;
			driver.totalRatings = driver.totalRatings + 1;
			driver.averageRating = Number((sumOfRatings / driver.totalRatings).toFixed(2));

			const driverResult: User = await this.unitOfWork.Users.update(driver.userId, driver);
			if (!driverResult) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Rating not Updated');

			const date: string = new Date().toISOString();
			const ratingObj: JourneyRating = {
				rating,
				passenger: user,
				times: {
					ratedAt: date
				}
			};

			journey.times.updatedAt = date;
			if (journey.ratings) journey.ratings.push(ratingObj);
			else journey.ratings = [ ratingObj ];

			const result: Journey = await this.unitOfWork.Journeys.update(journey.journeyId, createdAt, { ...journey });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Journey Not Found');

			result.readableDurations = SharedFunctions.TimeDurations(result.times);

			await this._removeCurrentJourney(user.userId, journey.journeyId);
			await this._publishJourneyUpdate(result, userId);

			return ResponseBuilder.ok({ journey: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to Save Rating');
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

	private _publishJourneyUpdate = async (journey: Journey, userId: string): Promise<void> => {
		await this.PubManager.publishCRUD({
			subscriptionName: 'journey/current',
			itemType: 'journey',
			itemId: journey.journeyId,
			data: { journey, updatedBy: userId },
			sendAsCollection: true,
			publishType: PublishType.UPDATE
		});
	}

	private _publishAutoJourneySub = async (journey: Journey, userId: string, connectionId: string, travellingAs: string): Promise<void> => {
		await this.PubManager.publishToSingleConnection({
			subscriptionName: 'journey/current',
			itemType: 'journey',
			itemId: journey.journeyId,
			data: { journey, updatedBy: userId, travellingAs },
			sendAsCollection: true,
			publishType: PublishType.UPDATE,
			connectionId
		});
	}

	private _publishPickupAlert = async (journey: Journey, passengerId: string): Promise<void> => {
		const userWithConnections: Partial<User> = await this.unitOfWork.Users.getUserConnections(passengerId);
		const connectionIds: string[] =
			userWithConnections.connections && userWithConnections.connections.map((con: UserConnection) => con.connectionId);

		await this.PubManager.publishToMultipleConnections({
			subscriptionName: 'journey/pickup-alerts',
			itemType: 'journey',
			itemId: journey.journeyId,
			data: { journey },
			sendAsCollection: true,
			publishType: PublishType.UPDATE,
			connectionIds
		});
	}

	private _publishDriverLocation = async (journeyId: string, coords: Coords): Promise<void> => {
		await this.PubManager.publishCRUD({
			subscriptionName: 'journey/driver-tracking',
			itemType: 'journey',
			itemId: journeyId,
			data: { journeyId, coords },
			sendAsCollection: true,
			publishType: PublishType.UPDATE
		});
	}

	private _publishPassengerLocation = async (journeyId: string, passengerId: string, coords: Coords): Promise<void> => {
		await this.PubManager.publishCRUD({
			subscriptionName: 'journey/passenger-tracking',
			itemType: 'journey',
			itemId: journeyId,
			data: { journeyId, passengerId, coords },
			sendAsCollection: true,
			publishType: PublishType.UPDATE
		});
	}

	// This function is run as a cron job at regular intervals to alert drivers & passengers of upcoming journeys
	public organiseUpcomingJourneys: ApiHandler = async (event: ApiEvent): Promise<void> => {
		const nextJourneys: Journey[] = await this.unitOfWork.Journeys.getNextJourneys();
		console.log(nextJourneys);
		console.log('------------------------------------');

		await Promise.all(nextJourneys.map(async (journey: Journey) => {
			const { driver, passengers }: Partial<Journey> = journey;

			console.log(driver);
			console.log(passengers);
			console.log('------------------------------------');
			if (!passengers.length) return; // Do not alert when journey has no passengers

			console.log('Subscribing');
			await Promise.all(passengers.map(async (passenger: PassengerBrief) => {
				console.log('Passenger');
				const user: Partial<User> = await this.unitOfWork.Users.getUserConnections(passenger.userId);
				const passengerConnections: UserConnection[] = user.connections;

				user.currentJourney = {
					journeyId: journey.journeyId,
					createdAt: journey.times.createdAt,
					travellingAs: 'Passenger'
				};

				await this.unitOfWork.Users.update(passenger.userId, user);

				await Promise.all(passengerConnections.map(async (connection: UserConnection) => {
					console.log('Passenger connection: ', connection.connectionId);
					await this.SubManager.subscribe({
						subscriptionName: 'journey/current',
						itemType: 'journey',
						itemId: journey.journeyId,
						connectionId: connection.connectionId,
						deviceId: connection.deviceId,
						userId: passenger.userId
					});

					await this.SubManager.subscribe({
						subscriptionName: 'journey/pickup-alerts',
						itemType: 'journey',
						itemId: journey.journeyId,
						connectionId: connection.connectionId,
						deviceId: connection.deviceId,
						userId: passenger.userId
					});

					await this._publishAutoJourneySub(journey, passenger.userId, connection.connectionId, 'Passenger');
				}));
			}));

			const driverUser: Partial<User> = await this.unitOfWork.Users.getUserConnections(driver.userId);
			const driverConnections: UserConnection[] = driverUser.connections;
			console.log('Driver');

			driverUser.currentJourney = {
				journeyId: journey.journeyId,
				createdAt: journey.times.createdAt,
				travellingAs: 'Driver'
			};

			await this.unitOfWork.Users.update(driver.userId, driverUser);

			await Promise.all(driverConnections.map(async (connection: UserConnection) => {
				console.log('Driver connection: ', connection.connectionId);
				await this.SubManager.subscribe({
					subscriptionName: 'journey/current',
					itemType: 'journey',
					itemId: journey.journeyId,
					connectionId: connection.connectionId,
					deviceId: connection.deviceId,
					userId: driver.userId
				});

				await this._publishAutoJourneySub(journey, driver.userId, connection.connectionId, 'Driver');
			}));

			journey.cronJobEvaluated = true; // Prevent cron running again on same journey

			await this.unitOfWork.Journeys.update(journey.journeyId, journey.times.createdAt, journey);
		}));
	}

}
