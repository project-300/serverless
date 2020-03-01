import { StatisticsController } from './statistics.controller';
import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: StatisticsController = new StatisticsController(unitOfWork);

export const createStatisticsDayForEachUni: ApiHandler = controller.createStatisticsDayForEachUni;
export const getStatisticsDayById: ApiHandler = controller.getStatisticsDayById;
export const getAllTotalStatsForOneUni: ApiHandler = controller.getAllTotalStatsForOneUni;
export const getForDateRangeOneUni: ApiHandler = controller.getForDateRangeOneUni;
export const getAllTotalForDateRangeAllUni: ApiHandler = controller.getAllTotalForDateRangeAllUni;
export const getTotalsForEachMonthOneUni: ApiHandler = controller.getTotalsForEachMonthOneUni;
