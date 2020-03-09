import { DayStatistics, DayStatisticsBrief } from '@project-300/common-types';

export interface IStatisticsRepository {
	getAllBetweenDatesForAllUniversities(startDate: string, endDate: string): Promise<DayStatisticsBrief[]>;
	getAllBetweenDatesForOneUniversity(startDate: string, endDate: string, universityId: string): Promise<DayStatisticsBrief[]>;
	getForToday(date: string, universityId: string): Promise<DayStatistics>;
	getForMonthForOneUni(date: string, universityId: string): Promise<DayStatisticsBrief[]>;
	getForMonthForAll(date: string): Promise<DayStatisticsBrief[]>;
	getAllForOneUniversity(universityId: string): Promise<DayStatisticsBrief[]>;
	getAllForAllUniversities(): Promise<DayStatisticsBrief[]>;
	getByIdAndDate(statsId: string, universityId: string, date: string): Promise<DayStatistics[]>;
	create(universityId: string, toCreate: Partial<DayStatistics>): Promise<DayStatistics>;
	update(statsId: string, universityId: string, date: string, changes: Partial<DayStatistics>): Promise<DayStatistics>;
	delete(statsId: string, universityId: string, date: string): Promise<DayStatistics | undefined>;
}
