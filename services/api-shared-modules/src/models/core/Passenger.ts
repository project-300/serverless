import { UserItem } from './User';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { Passenger } from '@project-300/common-types';

export class PassengerItem extends UserItem implements Passenger {
	@attribute()
	public journeysAsPassenger: Array<{ journeyId: string; createdAt: string }>;
}
