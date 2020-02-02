import { attribute, hashKey, rangeKey, table } from '@aws/dynamodb-data-mapper-annotations';

export interface DynamoDbItem {
	pk: string;
	sk: string;
	entity: string;
}

// TODO: Implement a mechanism to change this automatically based on environment
@table('dev-P300-GENERAL')
export class DynamoDbItem implements DynamoDbItem {
	@hashKey()
	public pk!: string;

	@rangeKey()
	public sk!: string;

	@attribute()
	public entity!: string;
}
