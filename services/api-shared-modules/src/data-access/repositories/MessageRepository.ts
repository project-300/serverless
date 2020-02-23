import { Message } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { Repository } from './Repository';
import { QueryKey, IMessageRepository } from '../interfaces';
import { MessageItem } from '../../models/core';

export class MessageRepository extends Repository implements IMessageRepository {

	public async getAllByChat(chatId: string): Promise<Message[]> {
		const keyCondition: QueryKey = {
			pk: `chat#${chatId}`
		};

		const queryOptions: QueryOptions = {};

		const queryIterator: QueryIterator<MessageItem> = this.db.query(MessageItem, keyCondition, queryOptions);
		const messages: Message[] = [];

		for await (const message of queryIterator) messages.push(message);

		return messages;
	}

	public async getById(chatId: string, createdAt: string): Promise<Message> {
		return this.db.get(Object.assign(new MessageItem(), {
			pk: `chat#${chatId}`,
			sk: `createdAt#${createdAt}`
		}));
	}

	public async create(toCreate: Partial<Message>): Promise<Message> {
		const createdAt: string = new Date().toISOString();

		return this.db.put(Object.assign(new MessageItem(), {
			pk: `chat#${toCreate.chatId}`,
			sk: `createdAt#${createdAt}`,
			entity: 'message',
			readByRecipient: false,
			times: {
				createdAt
			},
			...toCreate
		}));
	}

	public async update(chatId: string, createdAt: string, changes: Partial<Message>): Promise<Message> {
		return this.db.update(Object.assign(new MessageItem(), {
			pk: `chat#${chatId}`,
			sk: `createdAt#${createdAt}`,
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(chatId: string, createdAt: string): Promise<Message | undefined> {
		return this.db.delete(Object.assign(new MessageItem(), {
			pk: `chat#${chatId}`,
			sk: `createdAt#${createdAt}`
		}), {
			returnValues: 'ALL_OLD'
		});
	}

}
