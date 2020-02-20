import { BinaryComparisonPredicate } from '@aws/dynamodb-expressions';

export { IDriverApplicationRepository } from './IDriverApplicationRepository';
export { IUserRepository } from './IUserRepository';
export { IJourneyRepository } from './IJourneyRepository';
export { ISubscriptionRepository } from './ISubscriptionRepository';
export { IInterestRepository } from './IInterestRepository';

export interface QueryKey {
	pk?: string;
	sk?: string | BinaryComparisonPredicate;
	sk2?: string | BinaryComparisonPredicate;
	sk3?: string | BinaryComparisonPredicate;
	entity?: string;
}
