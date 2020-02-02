import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { Coords } from '@project-300/common-types';

export class CoordsItem implements Coords {
	@attribute()
	public latitude: number;

	@attribute()
	public longitude: number;
}
