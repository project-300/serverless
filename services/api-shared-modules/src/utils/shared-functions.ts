import { USERID_FOR_TESTING } from '../../../../environment/env';

export class SharedFunctions {

	public static getUserIdFromAuthProvider = (authProvider: string): string => {
		const parts: string[] = authProvider.split(':');

		const userId: string = process.env.IS_OFFLINE ? USERID_FOR_TESTING : parts[parts.length - 1];

		return userId;
	}
}
