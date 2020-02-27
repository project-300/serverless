import { UserStatistics, DayStatistics } from '@project-300/common-types';

export interface IStatisticsRepository {
	create(universityId: string, toCreate: Partial<DayStatistics>): Promise<DayStatistics>;
	update(statsId: string, universityId: string, date: string, changes: Partial<DayStatistics>): Promise<DayStatistics>;
}
