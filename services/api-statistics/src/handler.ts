import { StatisticsController } from './statistics.controller';
import { ApiHandler, UnitOfWork } from '../../api-shared-modules/src';

const unitOfWork: UnitOfWork = new UnitOfWork();
const controller: StatisticsController = new StatisticsController(unitOfWork);

export const createStatisticsDayForEachUni: ApiHandler = controller.createStatisticsDayForEachUni;
export const getStatisticsDayById: ApiHandler = controller.getStatisticsDayById;
export const getAllStatsForUniversity: ApiHandler = controller.getAllStatsForUniversity;
// export const getAllUsers: ApiHandler = controller.getAllUsers;
// export const getUserById: ApiHandler = controller.getUserById;
// export const createUser: ApiHandler = controller.createUser;
// export const updateUser: ApiHandler = controller.updateUser;
// export const deleteUser: ApiHandler = controller.deleteUser;
