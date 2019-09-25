import { ApiHandler } from '../../responses/api.types';
import { DataController } from './_data.contoller';

const controller: DataController = new DataController();

export const s3KeyRequestHandler: ApiHandler = controller.s3KeyRequestHandler;
