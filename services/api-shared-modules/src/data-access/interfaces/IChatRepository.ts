import { Chat } from '@project-300/common-types';

export interface IChatRepository {
	getAllByUser(userId: string): Promise<Chat[]>;
	getById(chatId: string, userIds: string[]): Promise<Chat>;
	getByUsers(userIds: string[]): Promise<Chat>;
	create(toCreate: Partial<Chat>): Promise<Chat>;
	update(chatId: string, changes: Partial<Chat>): Promise<Chat>;
	delete(chatId: string, userIds: string[]): Promise<Chat | undefined>;
}
