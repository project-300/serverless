import { DynamoDbItem } from '../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { Subscription } from '@project-300/common-types';

export class SubscriptionItem extends DynamoDbItem implements Subscription {

	@attribute()
	public connectionId!: string;

	@attribute()
	public subscriptionId!: string;

	@attribute()
	public itemType!: string;

	@attribute()
	public itemId!: string;

	@attribute()
	public deviceId!: string;

	@attribute()
	public userId?: string;

	@attribute()
	public times!: {
		subscribedAt: string;
	};

}
