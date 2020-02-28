import { DayStatistics } from '@project-300/common-types';

export interface IStatisticsRepository {
	getAllBetweenDatesForAllUniversities(startDate: string, endDate: string): Promise<DayStatistics[]>;
	getAllForUniversity(statsId: string, universityId: string): Promise<DayStatistics[]>;
	getByIdAndDate(statsId: string, universityId: string, date: string): Promise<DayStatistics[]>;
	create(universityId: string, toCreate: Partial<DayStatistics>): Promise<DayStatistics>;
	update(statsId: string, universityId: string, date: string, changes: Partial<DayStatistics>): Promise<DayStatistics>;
	delete(statsId: string, universityId: string, date: string): Promise<DayStatistics | undefined>;
}
