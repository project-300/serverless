import { Chat, UserBrief } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { QueryKey, IChatRepository } from '../interfaces';
import { ChatItem } from '../../models/core';
import { contains } from '@aws/dynamodb-expressions';

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
		const sk: string = this._sortIds(userIds.map((userId: string) => `user#${userId}`)).join('/');

		const keyCondition: QueryKey = {
			entity: 'chat',
			sk
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index',
			limit: 1
		};

		const queryIterator: QueryIterator<ChatItem> = this.db.query(ChatItem, keyCondition, queryOptions);
		let existingChat: Chat;

		for await (const chat of queryIterator) existingChat = chat;

		return existingChat;
	}

	public async create(toCreate: Partial<Chat>): Promise<Chat> {
		const chatId: string = uuid();
		const sk: string = this._sortIds(toCreate.users.map((user: UserBrief) => `user#${user.userId}`)).join('/');

		return this.db.put(Object.assign(new ChatItem(), {
			pk: `chat#${chatId}`,
			sk,
			sk2: `chat#${chatId}`,
			chatId,
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
		const sk: string = this._sortIds(changes.users.map((user: UserBrief) => `user#${user.userId}`)).join('/');

		return this.db.update(Object.assign(new ChatItem(), {
			pk: `chat#${chatId}`,
			sk,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(chatId: string, userIds: string[]): Promise<Chat | undefined> {
		const sk: string = this._sortIds(userIds.map((userId: string) => `user#${userId}`)).join('/');

		return this.db.delete(Object.assign(new ChatItem(), {
			pk: `chat#${chatId}`,
			sk
		}), {
			returnValues: 'ALL_OLD'
		});
	}

	private _sortIds = (userIds: string[]): string[] => userIds.sort();

}
