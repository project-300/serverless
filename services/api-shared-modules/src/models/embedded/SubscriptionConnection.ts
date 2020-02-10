import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { SubscriptionConnection } from '@project-300/common-types';

export class SubscriptionConnectionItem implements SubscriptionConnection {
	@attribute()
	public connectionId: string;

	@attribute()
	public userId: string;

	@attribute()
	public times: {
		subscribedAt: Date | string;
	};
}
