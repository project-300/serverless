import { AWS_S3_SECRET_KEY } from '../../../environment/env';
import { ResponseBuilder } from '../../responses/response-builder';
import { SecretKeyResult } from './_data.interfaces';
import { ApiEvent, ApiHandler, ApiResponse } from '../../responses/api.types';

export class DataController {

	public s3KeyRequestHandler: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const key: SecretKeyResult = {
			success: true,
			secretKey: AWS_S3_SECRET_KEY
		};

		try {
			return ResponseBuilder.ok(key);
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

}
