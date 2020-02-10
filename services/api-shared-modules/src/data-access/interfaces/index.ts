export { IDriverApplicationRepository } from './IDriverApplicationRepository';
export { IUserRepository } from './IUserRepository';
export { IJourneyRepository } from './IJourneyRepository';
export { ISubscriptionRepository } from './ISubscriptionRepository';
export { IInterestRepository } from './IInterestRepository';
export { IUniversityRepository } from './IUniversityRepository';

export interface QueryKey {
	entity?: string;
	createdBy?: string;
}
