import { LastEvaluatedKey, Message } from '@project-300/common-types';
import { QueryOptions, QueryPaginator } from '@aws/dynamodb-data-mapper';
import { Repository } from './Repository';
import { QueryKey, IMessageRepository } from '../interfaces';
import { MessageItem } from '../../models/core';
import { SharedFunctions } from '../../utils';
import { ConditionExpression, EqualityExpressionPredicate, equals } from '@aws/dynamodb-expressions';

export class MessageRepository extends Repository implements IMessageRepository {

	public async getAllByChat(chatId: string, lastEvaluatedKey?: LastEvaluatedKey):
		Promise<{ messages: Message[]; lastEvaluatedKey?: LastEvaluatedKey }> {
		const predicate: EqualityExpressionPredicate = equals('message');

		const equalsExpression: ConditionExpression = {
			...predicate,
			subject: 'entity'
		};

		const keyCondition: QueryKey = {
			pk: `chat#${chatId}`
		};

		const queryOptions: QueryOptions = {
			scanIndexForward: false,
			startKey: lastEvaluatedKey,
			filter: equalsExpression,
			limit: 10
		};

		const queryPages: QueryPaginator<MessageItem> = this.db.query(MessageItem, keyCondition, queryOptions).pages();
		const messages: Message[] = [];

		for await (const page of queryPages)
			for (const message of page) messages.push(message);

		return {
			messages,
			lastEvaluatedKey:
				queryPages.lastEvaluatedKey ?
					SharedFunctions.stripLastEvaluatedKey(queryPages.lastEvaluatedKey) :
					undefined
		};
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
