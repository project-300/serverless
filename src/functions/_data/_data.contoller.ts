import { ResponseBuilder } from '../../responses/response-builder';
import { SecretKeyResult } from './_data.interfaces';
import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../responses/api.types';

export class DataController {

	public s3KeyRequestHandler: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
		const key: SecretKeyResult = {
			success: true,
			secretKey: 'tRtsLus5ZF35rXhiBZjFDw6wp6XkfLLz2KZKv8zU'
		};

		try {
			ResponseBuilder.ok<SecretKeyResult>(key, callback);
		} catch (err) {
			ResponseBuilder.internalServerError(err, callback);
		}
	}

}
