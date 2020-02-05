import { UserRepository, JourneyRepository } from './repositories';
import { IUserRepository, IJourneyRepository } from './interfaces';
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { DynamoDB } from 'aws-sdk';

export class UnitOfWork {

	public Users: IUserRepository;
	public Journeys: IJourneyRepository;

	public constructor() {
		const db: DataMapper = new DataMapper({ client: new DynamoDB({ region: 'eu-west-1'}) });

		this.Users = new UserRepository(db);
		this.Journeys = new JourneyRepository(db);
	}

}