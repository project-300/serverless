import {
	UserRepository,
	JourneyRepository,
	SubscriptionRepository,
	InterestRepository,
	DriverApplicationRepository
} from './repositories';
import {
	IUserRepository,
	IJourneyRepository,
	ISubscriptionRepository,
	IInterestRepository,
	IDriverApplicationRepository
} from './interfaces';
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { DynamoDB } from 'aws-sdk';

export class UnitOfWork {

	public Users: IUserRepository;
	public Journeys: IJourneyRepository;
	public Subscriptions: ISubscriptionRepository;
	public DriverApplications: IDriverApplicationRepository;
	public Interests: IInterestRepository;

	public constructor() {
		const db: DataMapper = new DataMapper({ client: new DynamoDB({ region: 'eu-west-1' }) });

		this.Users = new UserRepository(db);
		this.Journeys = new JourneyRepository(db);
		this.Subscriptions = new SubscriptionRepository(db);
		this.DriverApplications = new DriverApplicationRepository(db);
		this.Interests = new InterestRepository(db);
	}

}
