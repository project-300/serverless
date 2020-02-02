import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { PromiseResult } from 'aws-sdk/lib/request';

export type ScanResult = PromiseResult<DocumentClient.ScanOutput, AWS.AWSError>;

export type ScanResultPromise = Promise<ScanResult>;

export type QueryResult = PromiseResult<DocumentClient.QueryOutput, AWS.AWSError>;

export type QueryResultPromise = Promise<QueryResult>;

export type GetResult = PromiseResult<DocumentClient.GetItemOutput, AWS.AWSError>;

export type GetResultPromise = Promise<GetResult>;

export type PutResultPromise = Promise<PromiseResult<DocumentClient.PutItemOutput, AWS.AWSError>>;

export type PutResult = PromiseResult<DocumentClient.PutItemOutput, AWS.AWSError>;

export type UpdateResult = Promise<PromiseResult<DocumentClient.UpdateItemOutput, AWS.AWSError>>;

export type DeleteResult = Promise<PromiseResult<DocumentClient.DeleteItemOutput, AWS.AWSError>>;
