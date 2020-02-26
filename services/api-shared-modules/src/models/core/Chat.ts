import { DynamoDbItem } from '../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { Chat, UserBrief } from '@project-300/common-types';

export class ChatItem extends DynamoDbItem implements Chat {
	@attribute()
	public chatId!: string;

	@attribute()
	public messageCount!: number;

	@attribute()
	public lastMessage: string;

	@attribute()
	public started!: boolean;

	@attribute()
	public users!: UserBrief[];

	@attribute()
	public times!: {
		createdAt: string;
		updatedAt?: string;
	};

}
