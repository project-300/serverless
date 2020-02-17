import { USERID_FOR_TESTING } from '../../../../environment/env';
import { DynamoDbItem } from '../models';

export class SharedFunctions {

	public static getUserIdFromAuthProvider = (authProvider: string): string => {
		if (process.env.ENVIRONMENT === 'dev') return USERID_FOR_TESTING;
		if (!process.env.IS_OFFLINE && !authProvider) throw Error('No Auth Provider');

		const parts: string[] = authProvider.split(':');
		const userId: string =  process.env.IS_OFFLINE ? parts[parts.length - 1] : USERID_FOR_TESTING;

		if (!userId) throw Error('Unauthorised action');

		return userId;
	}

	public static stripLastEvaluatedKey = (lastEvaluatedKey: Partial<DynamoDbItem>): Partial<DynamoDbItem> => {
		const values: Array<Partial<DynamoDbItem>> = Object.keys(lastEvaluatedKey).map((key: string) => {
			const parts: string[] = lastEvaluatedKey[key].split('#');
			if (parts.length > 1) return { [key]: parts[1] };
			return { [key]: parts[0] };
		});

		return values.reduce(
			(memo: Partial<DynamoDbItem>, val: Partial<DynamoDbItem>) => ({ ...memo, ...val }),
			{ }
		);
	}

}
