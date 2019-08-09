import { ApiEvent, ApiHandler } from '../../responses/api.interfaces';
import util from '../../utils';
import data from './LiftList.json';

export class LiftsController {

    public getLifts: ApiHandler = async (event: ApiEvent): Promise<object> => {
        try {
            return {
                statusCode: 200,
                headers: util.getResponseHeaders(),
                body: JSON.stringify(data)
            };
        } catch (err) {
            return {
                statusCode: err.statusCode ? err.statusCode : 500,
                headers: util.getResponseHeaders(),
                body: JSON.stringify({
                    error: err.name ? err.name : 'Exception',
                    message: err.message ? err.message : 'Unknown error'
                })
            };
        }
    }
}
