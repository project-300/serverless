import * as AWS from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { PublishType } from '../pubsub/publication';
import { ErrorResult } from './errors';
import { APIGatewayEvent, Context, ProxyCallback, ProxyResult } from 'aws-lambda';

export type ApiCallback = ProxyCallback;
export type ApiContext = Context;
export type ApiEvent = APIGatewayEvent;
export type ApiHandler = (event: APIGatewayEvent, context: Context, callback: ApiCallback) => void;
export type ApiResponse = ProxyResult;

export interface WebsocketResponse {
	subscription: string | undefined;
	type?: PublishType;
	objectId?: string;
	isCollection?: boolean;
	data?: object | string;
	notice?: string;
	error?: string;
}

export type WsPostResult = PromiseResult<{ }, AWS.AWSError> | void;

export interface ErrorResponseBody {
	error: ErrorResult;
	success: boolean;
}
