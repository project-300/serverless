import { Chat } from '@project-300/common-types';

export interface ChatData {
	chat: Partial<Chat>;
	userIds: string[];
}
