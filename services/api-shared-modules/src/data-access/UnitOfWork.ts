import { UserRepository, JourneyRepository, SubscriptionRepository } from './repositories';
import { IUserRepository, IJourneyRepository } from './interfaces';
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { DynamoDB } from 'aws-sdk';
import { ISubscriptionRepository } from './interfaces/ISubscriptionRepository';

export class UnitOfWork {

	public Users: IUserRepository;
	public Journeys: IJourneyRepository;
	public Subscriptions: ISubscriptionRepository;

	public constructor() {
		const db: DataMapper = new DataMapper({ client: new DynamoDB({ region: 'eu-west-1' }) });

		this.Users = new UserRepository(db);
		this.Journeys = new JourneyRepository(db);
		this.Subscriptions = new SubscriptionRepository(db);
	}

}
