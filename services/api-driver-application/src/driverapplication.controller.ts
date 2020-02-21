import { DriverApplicationObject, User } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	UnitOfWork,
	VehicleAPI
	// SharedFunctions
  } from '../../api-shared-modules/src';

export class DriverApplicationController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public checkIfUserHasApplied: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.userId) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}

		const userId: string = event.pathParameters.userId;

		try {
			const application: DriverApplicationObject = await this.unitOfWork.DriverApplications.getByUserId(userId);

			const alreadyApplied: boolean = application ? true : false;

			return ResponseBuilder.ok({ alreadyApplied });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public getAllApplications: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.queryStringParameters || !event.queryStringParameters.approved) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}
		const { approved }: { [params: string]: string } = event.queryStringParameters;
		// const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

		try {
			const applications: DriverApplicationObject[] = await this.unitOfWork.DriverApplications.getAll(approved);
			if (!applications) {
				return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed at getting Applications');
			}
			return ResponseBuilder.ok({ applications });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public getApplicationByUserId: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.userId) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}

		const userId: string = event.pathParameters.userId;

		try {
			const application: DriverApplicationObject = await this.unitOfWork.DriverApplications.getByUserId(userId);

			if (!application) {
				return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Application Not Found');
			}

			return ResponseBuilder.ok({ application });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public applyForApplication: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.body) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');
		}

		const application: Partial<DriverApplicationObject> = JSON.parse(event.body) as Partial<DriverApplicationObject>;
		const { userId }: { userId?: string} = application;

		try {
			const checkIfApplicationExists: DriverApplicationObject = await this.unitOfWork.DriverApplications.getByUserId(userId);
			if (checkIfApplicationExists) {
				throw Error('You have already made an application');
			}

			const result: DriverApplicationObject = await this.unitOfWork.DriverApplications.create(userId, application);
			if (!result) {
				return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'failed to create new application');
			}

			return ResponseBuilder.ok({ application });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public approveApplication: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.userId) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}

		const userId: string = event.pathParameters.userId;

		try {
			const user: User = await this.unitOfWork.Users.update(userId, { userType: 'Driver' });
			if (!user) {
				throw Error('Failed to update user');
			}

			const application: DriverApplicationObject = await this.unitOfWork.DriverApplications.update(userId, { approved: true });
			if (!application) {
				throw Error('Failed to update application');
			}

			return ResponseBuilder.ok({ application });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public deleteApplication: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.userId) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}

		const userId: string = event.pathParameters.userId;

		try {
			const application: DriverApplicationObject = await this.unitOfWork.DriverApplications.delete(userId);
			if (!application) {
				return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to delete application');
			}
			return ResponseBuilder.ok({ application });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public getAllVehicleMakes: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		try {
			const result = await VehicleAPI.getAllMakes();
			return ResponseBuilder.ok({ result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public getAllVehicleModelsForMakeAndYear: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.queryStringParameters || !event.queryStringParameters.year || !event.queryStringParameters.makeId) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}
		const { year, makeId }: { [params: string]: string} = event.queryStringParameters;
		try {
			const result = await VehicleAPI.getModelsForMakeAndYear(makeId, year);

			if (result === undefined || result.length === 0) {
				throw new Error('There is no models for this make or year');
			}
			return ResponseBuilder.ok({ result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}
}
