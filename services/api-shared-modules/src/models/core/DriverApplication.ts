import { DynamoDbItem } from './../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { DriverApplicationObject } from '@project-300/common-types';

export class DriverApplicationItem extends DynamoDbItem implements DriverApplicationObject {
	@attribute()
	public userId!: string;

	@attribute()
	public approved?: boolean;

	@attribute()
	public times: {
		applied: string;
		approved?: string;
	};
}
