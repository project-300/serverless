import { DayStatisticsItem } from './../../models/core/Statistics';
import { DayStatistics, DayStatisticsBrief } from '@project-300/common-types';
import { QueryOptions, QueryIterator } from '@aws/dynamodb-data-mapper';
import { v4 as uuid } from 'uuid';
import { Repository } from './Repository';
import { IStatisticsRepository, QueryKey } from '../interfaces';
import { beginsWith, between } from '@aws/dynamodb-expressions';

export class StatisticsRepository extends Repository implements IStatisticsRepository {

	public async getAllBetweenDatesForAllUniversities(startDate: string, endDate: string): Promise<DayStatisticsBrief[]> {
		const keyCondition: QueryKey = {
			entity: 'statistics',
			sk2: between(`date#${startDate}`, `date#${endDate}`)
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk2-index',
			projection: [ 'emissions', 'distance', 'fuel', 'times' ]
		};

		const queryIterator: QueryIterator<DayStatisticsBrief> = this.db.query(DayStatisticsItem, keyCondition, queryOptions);
		const dayStatistics: DayStatisticsBrief[] = [];

		for await (const stats of queryIterator) dayStatistics.push(stats);

		return dayStatistics;
	}

	public async getAllBetweenDatesForOneUniversity(startDate: string, endDate: string, universityId: string): Promise<DayStatisticsBrief[]> {
		const keyCondition: QueryKey = {
			entity: 'statistics',
			sk: between(`university#${universityId}/date#${startDate}`, `university#${universityId}/date#${endDate}`)
		};

		const queryOptions: QueryOptions = {
			indexName: 'entity-sk-index',
			projection: [ 'emissions', 'distance', 'fuel', 'times' ]
		};

		const queryIterator: QueryIterator<DayStatisticsBrief> = this.db.query(DayStatisticsItem, keyCondition, queryOptions);
		const dayStatistics: DayStatisticsBrief[] = [];

		for await (const stats of queryIterator) dayStatistics.push(stats);

		return dayStatistics;
	}

	public async getAllForUniversity(universityId: string): Promise<DayStatisticsBrief[]> {
		const keyCondition: QueryKey = {
			entity: `statistics`,
			sk: beginsWith(`university#${universityId}`)
		};

		const queryOptions: QueryOptions = {
			projection: [ 'emissions', 'distance', 'fuel', 'times' ],
			indexName: 'entity-sk-index'
		};

		const queryIterator: QueryIterator<DayStatisticsBrief> = this.db.query(DayStatisticsItem, keyCondition, queryOptions);
		const dayStatistics: DayStatisticsBrief[] = [];

		for await (const stats of queryIterator) dayStatistics.push(stats);

		return dayStatistics;
	}

	public async getForMonth(date: string, universityId: string): Promise<DayStatisticsBrief[]> {
		const keyCondition: QueryKey = {
			entity: `statistics`,
			sk: beginsWith(`universityId#${universityId}date#${date}`)
		};

		const queryOptions: QueryOptions = {
			projection: [ 'emissions', 'distance', 'fuel', 'times' ],
			indexName: 'entity-sk-index'
		};

		const queryIterator: QueryIterator<DayStatisticsBrief> = this.db.query(DayStatisticsItem, keyCondition, queryOptions);
		const dayStatistics: DayStatisticsBrief[] = [];

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
		const parsedDate: string = date.split('T')[0];

		return this.db.put(Object.assign(new DayStatisticsItem(), {
			entity: 'statistics',
			pk: `stats#${id}`,
			sk: `university#${universityId}/date#${parsedDate}`,
			sk2: `date#${parsedDate}`,
			times: {
				createdAt: date
			},
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
