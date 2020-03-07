import { USERID_FOR_TESTING } from '../../../../environment/env';
import { DynamoDbItem } from '../models';
import { Chat, ChatUser, Message, TimeDuration } from '@project-300/common-types';

export class SharedFunctions {

	public static getUserIdFromAuthProvider = (authProvider: string): string => {
		if (process.env.ENVIRONMENT === 'dev' && process.env.IS_OFFLINE) return USERID_FOR_TESTING;
		if (!process.env.IS_OFFLINE && !authProvider) throw Error('No Auth Provider');

		const parts: string[] = authProvider.split(':');
		const userId: string = process.env.IS_OFFLINE ? USERID_FOR_TESTING : parts[parts.length - 1];

		if (!userId) throw Error('Unauthorised action');
		return userId;
	}

	public static checkRole = (roles: string[], userRole: string): boolean => roles.some((role: string) => role === userRole);

	public static checkUserRole = (roles: string[], userRole: string): void => {
		if (!roles.some((role: string) => role === userRole)) throw Error('Unauthorised User');
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

	public static TimeDurations = (times: { [key: string]: string | Date }): { [key: string]: string } =>
		Object.keys(times).reduce((memo: { [key: string]: string }, key: string) => {
			Object.assign(memo, { [key]: TimeDuration(times[key]) });
			return memo;
		}, { })

	public static setMessageFlags = (userId: string, messages: Message[]): Message[] =>
		messages.map(
			(m: Message) => {
				if (m.createdBy.userId === userId) m.userOwnMessage = true;
				return m;
			}
		)

	public static markOwnUserChats = (userId: string, chats: Chat[]): Chat[] =>
		chats.map(
			(c: Chat) => {
				const otherUser: ChatUser = c.users.find((u: ChatUser) => u.userId !== userId);
				const currentUser: ChatUser = c.users.find((u: ChatUser) => u.userId === userId);
				c.otherUser = otherUser;
				c.unreadCount = currentUser.unreadCount || 0;
				return c;
			}
		)

}
