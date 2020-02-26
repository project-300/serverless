import { DynamoDbItem } from '../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { Message, UserBrief } from '@project-300/common-types';

export class MessageItem extends DynamoDbItem implements Message {
	@attribute()
	public messageId!: string;

	@attribute()
	public chatId!: string;

	@attribute()
	public text!: string;

	@attribute()
	public readByRecipient!: boolean;

	@attribute()
	public deleted?: boolean;

	@attribute()
	public createdBy!: UserBrief;

	@attribute()
	public times!: {
		createdAt: string;
		updatedAt?: string;
		deletedAt?: string;
	};

}
