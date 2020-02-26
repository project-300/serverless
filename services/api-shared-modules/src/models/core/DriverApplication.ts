import { DynamoDbItem } from './../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { DriverApplicationObject, UserBrief, Vehicle } from '@project-300/common-types';

export class DriverApplicationItem extends DynamoDbItem implements DriverApplicationObject {
	@attribute()
	public userId!: string;

	@attribute()
	public user: UserBrief;

	@attribute()
	public approved?: boolean;

	@attribute()
	public vehicle: Vehicle;

	@attribute()
	public times: {
		applied: string;
		approved?: string;
	};

	@attribute()
	public vehicle: Vehicle;
}
