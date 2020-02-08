import { DriverApplicationObject, User } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	UnitOfWork
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

			return ResponseBuilder.ok({ success: true, alreadyApplied });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}

	public getAllApplications: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		if (!event.queryStringParameters || !event.queryStringParameters.approved) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}
		const { approved }: { [approved: string]: string } = event.queryStringParameters;

		try {
			const applications: DriverApplicationObject[] = await this.unitOfWork.DriverApplications.getAll(approved);
			if (!applications) {
				return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed at getting Applications');
			}
			return ResponseBuilder.ok({ success: true, applications});
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

			return ResponseBuilder.ok({ sucess: true, application });
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

			return ResponseBuilder.ok({ success: true, application: result });
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

			return ResponseBuilder.ok({ success: true, application });
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
			return ResponseBuilder.ok({ success: true, application });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message);
		}
	}
}
