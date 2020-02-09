import { USERID_FOR_TESTING } from './../../../../environment/env.tpl';

export class SharedFunctions {

	public static getUserIdFromAuthProvider = (authProvider: string): string => {
		const parts: string[] = authProvider.split(':');

		const userId: string = process.env.IS_OFFLINE ? parts[parts.length - 1] : USERID_FOR_TESTING;

		return userId;
	}
}
