import { DynamoDbItem } from './../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { UserStatistics } from '@project-300/common-types';

export class UserStatisticsItem extends DynamoDbItem implements UserStatistics {
	@attribute()
	public userId!: string;

	@attribute()
	public emissions!: number;

	@attribute()
	public distance!: number;

	@attribute()
	public fuel!: number;

	@attribute()
	public passengersEmissions?: number;
}
