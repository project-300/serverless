import { PlaceItem, CoordsItem } from '../embedded';
import { DynamoDbItem } from '../DynamoDBItem';
import { attribute } from '@aws/dynamodb-data-mapper-annotations';
import { Journey, DriverBrief, PassengerBrief, Coords, JourneyAction, JourneyRating } from '@project-300/common-types';

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
		createdAt: string;
		updatedAt?: string;
		leavingAt: string;
		estimatedArrival?: string;
		startedPickupAt?: string;
		startedAt?: string;
		pausedAt?: string;
		resumedAt?: string;
		endedAt?: string;
		cancelledAt?: string;
		arrivedAt?: string;
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

	@attribute()
	public completedDistance: number;

	@attribute()
	public distanceTravelled?: number;

	@attribute()
	public actionLogs: JourneyAction[];

	@attribute()
	public ratings: JourneyRating[];
}
