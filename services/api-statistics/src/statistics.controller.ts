import { StatsTotal, DatesArray } from './interfaces';
import {
	ResponseBuilder,
	ErrorCode,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork,
	ApiResponse,
	SharedFunctions
} from '../../api-shared-modules/src';
import { DayStatistics, University, DayStatisticsBrief, UserBrief } from '@project-300/common-types';

export class StatisticsController {
	public constructor(private unitOfWork: UnitOfWork) { }

	public createStatisticsDayForEachUni: ApiHandler = async (): Promise<string> => {
		const statsObject: Partial<DayStatistics> = {
			emissions: 0,
			fuel: 0,
			distance: 0,
			passengers: [],
			drivers: []
		};

		try {
			const universities: University[] = await this.unitOfWork.Universities.getAll();
			const universityIds: string[] = universities.map((u: University) => u.universityId);

			await Promise.all(universityIds.map(async (id: string) => this.unitOfWork.Statistics.create(id, statsObject)));

			return 'Success';
		} catch (err) {
			return 'Failure';
		}
	}

	public getStatisticsDayById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (
			!event.pathParameters ||
			!event.pathParameters.statisticsId ||
			!event.queryStringParameters ||
			!event.queryStringParameters.date ||
			!event.queryStringParameters.universityId
		) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}
		const statisticsId: string = event.pathParameters.statisticsId;
		const { date, universityId }: { [params: string]: string } = event.queryStringParameters;
		const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

		try {
			const user: UserBrief = await this.unitOfWork.Users.getUserBrief(userId);
			const rightRole: boolean = SharedFunctions.checkRole(['Admin', 'Moderator'], user.userType);

			if (!rightRole) return ResponseBuilder.forbidden(ErrorCode.ForbiddenAccess, 'Unauthorized');

			const result: DayStatistics[] = await this.unitOfWork.Statistics.getByIdAndDate(statisticsId, universityId, date);
			if (result.length === 0) {
				return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Statistics Not Found');
			}

			return ResponseBuilder.ok({ statistics: result[0] });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get Statistics');
		}
	}

	public getAllTotalStatsForOneUni: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.universityId) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}

		const universityId: string = event.pathParameters.universityId;
		const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

		try {
			const user: UserBrief = await this.unitOfWork.Users.getUserBrief(userId);
			const rightRole: boolean = SharedFunctions.checkRole(['Admin', 'Moderator'], user.userType);

			if (!rightRole) return ResponseBuilder.forbidden(ErrorCode.ForbiddenAccess, 'Unauthorized');

			const result: DayStatisticsBrief[] = await this.unitOfWork.Statistics.getAllForUniversity(universityId);
			const total: StatsTotal = this._addUpStatistics(result);

			return ResponseBuilder.ok({ statisticsTotal: total });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get Statistics');
		}
	}

	public getForDateRangeOneUni: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (
			!event.pathParameters
			|| !event.pathParameters.universityId
			|| !event.queryStringParameters
			|| !event.queryStringParameters.startDate
			|| !event.queryStringParameters.endDate) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}
		const universityId: string = event.pathParameters.universityId;
		const { startDate, endDate, totalsOnly }: { [params: string]: string } = event.queryStringParameters;
		const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

		try {
			const user: UserBrief = await this.unitOfWork.Users.getUserBrief(userId);
			const rightRole: boolean = SharedFunctions.checkRole(['Admin', 'Moderator'], user.userType);

			if (!rightRole) return ResponseBuilder.forbidden(ErrorCode.ForbiddenAccess, 'Unauthorized');

			const result: DayStatisticsBrief[] =
				await this.unitOfWork.Statistics.getAllBetweenDatesForOneUniversity(startDate, endDate, universityId);
			const total: StatsTotal = this._addUpStatistics(result);

			if (totalsOnly === 'true') {
				return ResponseBuilder.ok({ totalStatistics: total });
			}

			return ResponseBuilder.ok({ statistics: result, totalStatistics: total });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get Statistics');
		}
	}

	public getAllTotalForDateRangeAllUni: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (
			!event.queryStringParameters
			|| !event.queryStringParameters.startDate
			|| !event.queryStringParameters.endDate) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}

		const { startDate, endDate }: { [params: string]: string } = event.queryStringParameters;
		const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

		try {
			const user: UserBrief = await this.unitOfWork.Users.getUserBrief(userId);
			const rightRole: boolean = SharedFunctions.checkRole(['Admin', 'Moderator'], user.userType);

			if (!rightRole) return ResponseBuilder.forbidden(ErrorCode.ForbiddenAccess, 'Unauthorized');

			const result: DayStatisticsBrief[] = await this.unitOfWork.Statistics.getAllBetweenDatesForAllUniversities(startDate, endDate);
			const total: StatsTotal = this._addUpStatistics(result);

			return ResponseBuilder.ok({ statistics: total });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get Statistics');
		}
	}

	public getTotalsForEachMonthOneUni: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (
			!event.body
			|| !event.pathParameters
			|| !event.pathParameters.universityId) {
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');
		}
		const { dates }: { dates: string[] } = JSON.parse(event.body) as DatesArray;
		const universityId: string = event.pathParameters.universityId;
		const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

		try {
			const user: UserBrief = await this.unitOfWork.Users.getUserBrief(userId);
			const rightRole: boolean = SharedFunctions.checkRole(['Admin', 'Moderator'], user.userType);

			if (!rightRole) return ResponseBuilder.forbidden(ErrorCode.ForbiddenAccess, 'Unauthorized');

			const allStatsTotals: StatsTotal[] = await Promise.all(
				dates.map(async (d: string): Promise<StatsTotal> => {
					const stats: DayStatisticsBrief[] = await this.unitOfWork.Statistics.getForMonth(d, universityId);
					return this._addUpStatistics(stats);
				})
			);

			return ResponseBuilder.ok({ allStatsTotals });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, 'Unable to get Statistics');
		}
	}

	private _addUpStatistics = (stats: DayStatisticsBrief[]): StatsTotal => {
		const statsTotal: StatsTotal = {
			totalEmissions: 0,
			totalDistance: 0,
			totalFuel: 0
		};

		stats.forEach((s: DayStatisticsBrief) => {
			statsTotal.totalEmissions += s.emissions;
			statsTotal.totalDistance += s.distance;
			statsTotal.totalFuel += s.fuel;
		});

		return statsTotal;
	}
}
