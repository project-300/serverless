import * as AWS from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { ErrorResult } from './errors';
import { APIGatewayEvent, Context, ProxyCallback, ProxyResult, CognitoUserPoolEvent } from 'aws-lambda';

export type ApiCallback = ProxyCallback;
export type ApiContext = Context;
export type ApiEvent = APIGatewayEvent;
export type ApiHandler = (event: APIGatewayEvent, context: Context, callback: ApiCallback) => void;
export type ApiResponse = ProxyResult;

export type WsPostResult = PromiseResult<{ }, AWS.AWSError> | void;

export type TriggerCognitoEvent = CognitoUserPoolEvent;
export type TriggerCognitoHandler = (event: CognitoUserPoolEvent) => void;

export interface ErrorResponseBody {
	error: ErrorResult;
	success: boolean;
}
