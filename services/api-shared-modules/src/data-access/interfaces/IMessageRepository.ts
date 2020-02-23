import { LastEvaluatedKey, Message } from '@project-300/common-types';

export interface IMessageRepository {
	getAllByChat(chatId: string, lastEvaluatedKey?: LastEvaluatedKey): Promise<Message[]>;
	getById(chatId: string, createdAt: string): Promise<Message>;
	create(toCreate: Partial<Message>): Promise<Message>;
	update(chatId: string, createdAt: string, changes: Partial<Message>): Promise<Message>;
	delete(chatId: string, createdAt: string): Promise<Message | undefined>;
}
