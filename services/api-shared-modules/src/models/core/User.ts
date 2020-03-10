import { DynamoDbItem } from '../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { User, UserConnection, UserTypes } from '@project-300/common-types';

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
	public currentJourney?: {
		journeyId: string;
		createdAt: string;
		travellingAs: UserTypes;
	};

	@attribute()
	public interests?: string[];

	@attribute()
	public times: {
		confirmedAt?: string;
		createdAt: Date | string;
		lastLogin?: Date | string;
	};

	@attribute()
	public journeysAsPassenger: Array<{ journeyId: string; createdAt: string }>;

	@attribute()
	public isDriving: boolean;

	@attribute()
	public connections: UserConnection[];

	@attribute()
	public university?: {
		universityId: string;
		name: string;
	};

	@attribute()
	public totalRatings: number;

	@attribute()
	public averageRating: number;
}
