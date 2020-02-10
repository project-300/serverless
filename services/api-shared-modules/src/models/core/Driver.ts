import { UserItem } from './User';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { Driver } from '@project-300/common-types';

export class DriverItem extends UserItem implements Driver {
	@attribute()
	public isDriving: boolean;
}
