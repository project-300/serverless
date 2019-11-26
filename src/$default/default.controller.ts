import API from '../lib/api';
import { ResponseBuilder } from '../responses/response-builder';
import { DefaultResult } from './default.interfaces';
import { ApiEvent, ApiHandler, ApiResponse, WsPostResult } from '../responses/api.types';

export class DefaultController {

	public default: ApiHandler = async (event: ApiEvent): Promise<ApiResponse> => {
		const result: DefaultResult = {
			success: true
		};

		try {
			await this._replyWarning(event);
			return ResponseBuilder.ok(result);
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

	private _replyWarning = (event: ApiEvent): Promise<WsPostResult> =>
		API.post(event.requestContext.connectionId, { subscription: undefined, error: 'No function specified' })

}
