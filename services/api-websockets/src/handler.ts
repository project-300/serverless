import { ApiHandler } from '../../api-shared-modules/src/types';
import { ConnectController } from './websockets.controller';
import { UnitOfWork } from '../../api-shared-modules/src/data-access';
import SubscriptionManager from './pubsub/subscription';
import API from './lib/api';
import PublicationManager from './pubsub/publication';

const unitOfWork: UnitOfWork = new UnitOfWork();
const api: API = new API();
const subManager: SubscriptionManager = new SubscriptionManager(unitOfWork);
const pubManager: PublicationManager = new PublicationManager(unitOfWork, api);
const controller: ConnectController = new ConnectController(unitOfWork, subManager, pubManager, api);

export const $wsConnect: ApiHandler = controller.connect;
export const $wsDisconnect: ApiHandler = controller.disconnect;
export const $wsDefault: ApiHandler = controller.default;
// export const cleanupConnections: ApiHandler = controller.cleanupConnections;
export const updateConnection: ApiHandler = controller.updateConnection;
