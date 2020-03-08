import { DynamoDbItem } from '../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { Interest } from '@project-300/common-types';

export class InterestItem extends DynamoDbItem implements Interest {
	@attribute()
	public interestId!: string;

	@attribute()
	public universityId!: string;

	@attribute()
	public name!: string;

	@attribute()
	public times!: {
		createdAt: Date | string;
	};
}
