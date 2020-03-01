import { BaseFunctionExpressionPredicate, BetweenExpressionPredicate, BinaryComparisonPredicate, ConditionExpression } from '@aws/dynamodb-expressions';

export { IDriverApplicationRepository } from './IDriverApplicationRepository';
export { IUserRepository } from './IUserRepository';
export { IJourneyRepository } from './IJourneyRepository';
export { ISubscriptionRepository } from './ISubscriptionRepository';
export { IInterestRepository } from './IInterestRepository';
export { IUniversityRepository } from './IUniversityRepository';
export { IChatRepository } from './IChatRepository';
export { IMessageRepository } from './IMessageRepository';
export { IStatisticsRepository } from './IStatisticsRepository';

export interface QueryKey {
	pk?: string;
	sk?: string | BinaryComparisonPredicate | BaseFunctionExpressionPredicate | ConditionExpression | BetweenExpressionPredicate;
	sk2?: string | BinaryComparisonPredicate | BaseFunctionExpressionPredicate | ConditionExpression | BetweenExpressionPredicate;
	sk3?: string | BinaryComparisonPredicate | BaseFunctionExpressionPredicate | ConditionExpression;
	entity?: string;
}
