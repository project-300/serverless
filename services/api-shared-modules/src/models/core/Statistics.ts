import { DynamoDbItem } from './../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { DayStatistics } from '@project-300/common-types';
import { UserStatisticsItem } from '../embedded/UserStatistics';

export class DayStatisticsItem extends DynamoDbItem implements DayStatistics {
	@attribute()
	public emissions!: number;

	@attribute()
	public distance!: number;

	@attribute()
	public fuel!: number;

	@attribute()
	public passengers!: UserStatisticsItem[];

	@attribute()
	public drivers!: UserStatisticsItem[];
}
