import { DynamoDbItem } from '../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { University } from '@project-300/common-types';

export class UniversityItem extends DynamoDbItem implements University {
	@attribute()
	public universityId!: string;

	@attribute()
	public name!: string;

	@attribute()
	public emailDomains!: string[];

	@attribute()
	public times!: {
		createdAt: Date | string;
		updatedAt?: Date | string;
	};
}
