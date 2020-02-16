export { IDriverApplicationRepository } from './IDriverApplicationRepository';
export { IUserRepository } from './IUserRepository';
export { IJourneyRepository } from './IJourneyRepository';
export { ISubscriptionRepository } from './ISubscriptionRepository';
export { IInterestRepository } from './IInterestRepository';

export interface QueryKey {
	pk?: string;
	sk?: string;
	entity?: string;
	createdBy?: string;
}
