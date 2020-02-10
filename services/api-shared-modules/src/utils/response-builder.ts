import { ErrorCode } from '../types/error-codes';
import { HttpStatusCode } from '../types/http-status-codes';
import { ApiResponse } from '../types/api.types';
import {
	BadRequestResult,
	ConfigurationErrorResult,
	ErrorResult,
	ForbiddenResult,
	InternalServerErrorResult,
	NotFoundResult
} from '../types/errors';

export class ResponseBuilder {

	public static badRequest = (code: string, description: string): ApiResponse => {
		const errorResult: BadRequestResult = new BadRequestResult(code, description);
		return ResponseBuilder.createResponse(HttpStatusCode.BadRequest, errorResult);
	}

	public static configurationError = (code: string, description: string): ApiResponse => {
		const errorResult: ConfigurationErrorResult = new ConfigurationErrorResult(code, description);
		return ResponseBuilder.createResponse(HttpStatusCode.ConfigurationError, errorResult);
	}

	public static forbidden = (code: string, description: string): ApiResponse => {
		const errorResult: ForbiddenResult = new ForbiddenResult(code, description);
		return ResponseBuilder.createResponse(HttpStatusCode.Forbidden, errorResult);
	}

	public static internalServerError = (error: Error | { [k: string]: any }, description?: string): ApiResponse => {
		const errorResult: InternalServerErrorResult =
			new InternalServerErrorResult(ErrorCode.GeneralError, description || 'Internal Server Error');
		return ResponseBuilder.createResponse(HttpStatusCode.InternalServerError, errorResult);
	}

	public static notFound = (code: string, description: string): ApiResponse => {
		const errorResult: NotFoundResult = new NotFoundResult(code, description);
		return ResponseBuilder.createResponse(HttpStatusCode.NotFound, errorResult);
	}

	public static ok = (result: any): ApiResponse => ResponseBuilder.createResponse(HttpStatusCode.Ok, result);

	private static createResponse = (statusCode: number, obj: ErrorResult | any): ApiResponse => {
		const bodyObject: any = obj instanceof ErrorResult
			? { error: obj, success: false }
			: { ...obj, success: true };

		return {
			statusCode,
			body: JSON.stringify(bodyObject),
			headers: {
				'Access-Control-Allow-Origin': '*'
			}
		};
	}

}
