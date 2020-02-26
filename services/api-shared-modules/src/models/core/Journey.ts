import { PlaceItem, CoordsItem } from '../embedded';
import { DynamoDbItem } from '../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { Journey, DriverBrief, PassengerBrief, Coords } from '@project-300/common-types';

export class JourneyItem extends DynamoDbItem implements Journey {
	@attribute()
	public journeyId!: string;

	@attribute()
	public journeyStatus!: 'NOT_STARTED' | 'STARTED' | 'ARRIVED' | 'FINISHED' | 'CANCELLED';

	@attribute()
	public driver!: DriverBrief;

	@attribute()
	public passengers!: PassengerBrief[];

	@attribute()
	public times!: {
		createdAt: Date | string;
		updatedAt?: Date | string;
		leavingAt: Date | string;
		estimatedArrival?: Date | string;
		startedAt?: Date | string;
		endedAt?: Date | string;
		arrivedAt?: Date | string;
	};

	@attribute()
	public destination!: PlaceItem;

	@attribute()
	public origin!: PlaceItem;

	@attribute()
	public totalNoOfSeats!: number;

	@attribute()
	public seatsLeft!: number;

	@attribute()
	public pricePerSeat!: number;

	@attribute()
	public plannedRoute!: CoordsItem[];

	@attribute()
	public routeTravelled!: CoordsItem[];

	@attribute()
	public searchText!: string;

	@attribute()
	public midpoint!: Coords;

	@attribute()
	public available!: boolean;

	@attribute()
	public mapMidpointImage?: string;
}
