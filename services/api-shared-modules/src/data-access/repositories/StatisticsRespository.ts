import { DayStatisticsItem } from './../../models/core/Statistics';
import { DayStatistics } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { IStatisticsRepository, QueryKey } from '../interfaces';
import { beginsWith, between } from '@aws/dynamodb-expressions';

export class StatisticsRepository extends Repository implements IStatisticsRepository {

	public async getAllBetweenDatesForAllUniversities(startDate: string, endDate: string): Promise<DayStatistics[]> {
		const keyCondition: QueryKey = {
			entity: 'statistics',
			sk2: between(`date#${startDate}`, `date#${endDate}`)
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk2-index',
			projection: [ 'emissions', 'distance', 'fule' ]
		};

		const queryIterator: QueryIterator<DayStatistics> = this.db.query(DayStatisticsItem, keyCondition, queryOptions);
		const dayStatistics: DayStatistics[] = [];

		for await (const stats of queryIterator) dayStatistics.push(stats);

		return dayStatistics;
	}

	public async getAllForUniversity(statsId: string, universityId: string): Promise<DayStatistics[]> {
		const keyCondition: QueryKey = {
			pk: `stats#${statsId}`,
			sk: beginsWith(`university#${universityId}`)
		};

		// const queryOptions: QueryOptions = {
		// 	// projection: [ 'emissions', 'distance', 'fule' ]
		// };

		const queryIterator: QueryIterator<DayStatistics> = this.db.query(DayStatisticsItem, keyCondition);
		const dayStatistics: DayStatistics[] = [];

		for await (const stats of queryIterator) dayStatistics.push(stats);

		return dayStatistics;
	}

	public async getByIdAndDate(statsId: string, universityId: string, date: string): Promise<DayStatistics[]> {
			const keyCondition: QueryKey = {
				pk: `stats#${statsId}`,
				sk: beginsWith(`university#${universityId}/date#${date}`)
			};
			const queryIterator: QueryIterator<DayStatistics> = this.db.query(DayStatisticsItem, keyCondition);
			const dayStatistics: DayStatistics[] = [];

			for await (const stats of queryIterator) dayStatistics.push(stats);

			return dayStatistics;
	}

	public async create(universityId: string, toCreate: Partial<DayStatistics>): Promise<DayStatistics> {
		const id: string = uuid();
		const date: string = new Date().toISOString();

		return this.db.put(Object.assign(new DayStatisticsItem(), {
			entity: 'statistics',
			pk: `stats#${id}`,
			sk: `university#${universityId}/date#${date}`,
			sk2: `date#${date}`,
			...toCreate
		}));
	}

	public async update(statsId: string, universityId: string, date: string, changes: Partial<DayStatistics>): Promise<DayStatistics> {
		return this.db.update(Object.assign(new DayStatisticsItem(), {
			pk: `stats#${statsId}`,
			sk: beginsWith(`university#${universityId}/date#${date}`),
			...changes
		}), {
			onMissing: 'skip'
		});
	}

	public async delete(statsId: string, universityId: string, date: string): Promise<DayStatistics | undefined> {
		return this.db.delete(Object.assign(new DayStatisticsItem(), {
			pk: `stats#${statsId}`,
			sk: beginsWith(`university#${universityId}/date#${date}`)
		}), {
			returnValues: 'ALL_OLD'
		});
	}
}
