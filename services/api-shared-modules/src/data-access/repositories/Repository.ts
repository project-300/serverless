import { DataMapper } from '@aws/dynamodb-data-mapper';

export class Repository {
	public constructor(protected db: DataMapper) { }
}
