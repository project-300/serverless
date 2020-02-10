import { DynamoDbItem } from './../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { Subscription } from '@project-300/common-types';
import { SubscriptionConnectionItem } from '../embedded';

export class SubscriptionItem extends DynamoDbItem implements Subscription {
	@attribute()
	public connections!: SubscriptionConnectionItem[];

	@attribute()
	public times!: {
		createdAt: Date | string;
	};
}
