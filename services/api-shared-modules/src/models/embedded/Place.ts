import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { Place } from '@project-300/common-types';

export class PlaceItem implements Place {
	@attribute()
	public latitude: number;

	@attribute()
	public longitude: number;

	@attribute()
	public name: string;
}
