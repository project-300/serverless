import { Chat, UserBrief } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { QueryKey, IChatRepository } from '../interfaces';
import { ChatItem } from '../../models/core';
import { contains, equals, OrExpression } from '@aws/dynamodb-expressions';

export class ChatRepository extends Repository implements IChatRepository {

	public async getAllByUser(userId: string): Promise<Chat[]> {
		const keyCondition: QueryKey = {
			entity: 'chat',
			sk: contains(`user#${userId}`)
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index'
		};

		const queryIterator: QueryIterator<ChatItem> = this.db.query(ChatItem, keyCondition, queryOptions);
		const chats: Chat[] = [];

		for await (const chat of queryIterator) chats.push(chat);

		return chats;
	}

	public async getById(chatId: string, userIds: string[]): Promise<Chat> {
		const sk: string = `user#${userIds.join('/user#')}`;

		return this.db.get(Object.assign(new ChatItem(), {
			pk: `chat#${chatId}`,
			sk
		}));
	}

	public async getByUsers(userIds: string[]): Promise<Chat> {
		const skA: string = userIds.map((userId: string) => `user#${userId}`).join('/');
		const skB: string = userIds.reverse().map((userId: string) => `user#${userId}`).join('/');

		const predicate: OrExpression = {
			type: 'Or',
			conditions: [ {
				...equals(skA),
				subject: 'sk'
			}, {
				...equals(skB),
				subject: 'sk'
			} ]
		};

		const keyCondition: QueryKey = {
			entity: 'chat'
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk2-index',
			filter: predicate,
			limit: 1
		};

		const queryIterator: QueryIterator<ChatItem> = this.db.query(ChatItem, keyCondition, queryOptions);
		let existingChat: Chat;

		for await (const chat of queryIterator) existingChat = chat;

		return existingChat;
	}

	public async create(toCreate: Partial<Chat>): Promise<Chat> {
		const id: string = uuid();
		const sk: string = toCreate.users.map((user: UserBrief) => `user#${user.userId}`).join('/');

		return this.db.put(Object.assign(new ChatItem(), {
			pk: `chat#${id}`,
			sk,
			sk2: `chat#${id}`,
			entity: 'chat',
			messageCount: 0,
			started: false,
			times: {
				createdAt: new Date().toISOString()
			},
			...toCreate
		}));
	}

	public async update(chatId: string, changes: Partial<Chat>): Promise<Chat> {
		const sk: string = changes.users.map((user: UserBrief) => `user#${user.userId}`).join('/');

		return this.db.update(Object.assign(new ChatItem(), {
			pk: `chat#${chatId}`,
			sk,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(chatId: string, userIds: string[]): Promise<Chat | undefined> {
		const sk: string = userIds.map((userId: string) => `user#${userId}`).join('/');

		return this.db.delete(Object.assign(new ChatItem(), {
			pk: `chat#${chatId}`,
			sk
		}), {
			returnValues: 'ALL_OLD'
		});
	}

}
