import { USERID_FOR_TESTING } from '../../../../environment/env';

export class SharedFunctions {

	public static getUserIdFromAuthProvider = (authProvider: string): string => {
		if (process.env.ENVIRONMENT === 'dev') return USERID_FOR_TESTING;
		if (!process.env.IS_OFFLINE && !authProvider) throw Error('No Auth Provider');

		const parts: string[] = authProvider.split(':');
		const userId: string =  process.env.IS_OFFLINE ? parts[parts.length - 1] : USERID_FOR_TESTING;

		if (!userId) throw Error('Unauthorised action');

		return userId;
	}
}
