import { BaseFunctionExpressionPredicate, BinaryComparisonPredicate, ConditionExpression } from '@aws/dynamodb-expressions';

export { IDriverApplicationRepository } from './IDriverApplicationRepository';
export { IUserRepository } from './IUserRepository';
export { IJourneyRepository } from './IJourneyRepository';
export { ISubscriptionRepository } from './ISubscriptionRepository';
export { IInterestRepository } from './IInterestRepository';
export { IUniversityRepository } from './IUniversityRepository';
export { IChatRepository } from './IChatRepository';

export interface QueryKey {
	pk?: string;
	sk?: string | BinaryComparisonPredicate | BaseFunctionExpressionPredicate | ConditionExpression;
	sk2?: string | BinaryComparisonPredicate | BaseFunctionExpressionPredicate;
	sk3?: string | BinaryComparisonPredicate | BaseFunctionExpressionPredicate;
	entity?: string;
}
