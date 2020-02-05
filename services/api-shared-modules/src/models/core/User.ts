import { DynamoDbItem } from './../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { User } from '@project-300/common-types';

export class UserItem extends DynamoDbItem implements User {
	@attribute()
	public userId!: string;

	@attribute()
	public username!: string;

	@attribute()
	public firstName!: string;

	@attribute()
	public lastName!: string;

	@attribute()
	public avatar!: string;

	@attribute()
	public userType!: 'Passenger' | 'Driver' | 'Admin';

	@attribute()
	public email!: string;

	@attribute()
	public phone!: string;

	@attribute()
	public confirmed!: boolean;

	@attribute()
	public isOnJourney!: boolean;

	@attribute()
	public currentJourneyId!: string;

	@attribute()
	public interests?: string[];

	@attribute()
	public times: {
		confirmedAt?: string;
		createdAt: Date | string;
		lastLogin?: Date | string;
	};
}