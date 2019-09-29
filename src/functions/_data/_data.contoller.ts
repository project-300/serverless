import { AWS_S3_SECRET_KEY } from '../../../environment/env';
import { ResponseBuilder } from '../../responses/response-builder';
import { SecretKeyResult } from './_data.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.types';

export class DataController {

	public s3KeyRequestHandler: ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback): void => {
		const key: SecretKeyResult = {
			success: true,
			secretKey: AWS_S3_SECRET_KEY
		};

		try {
			ResponseBuilder.ok<SecretKeyResult>(key, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback);
		}
	}

}
