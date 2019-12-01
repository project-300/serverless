import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ResponseBuilder } from '../../responses/response-builder';
import { GetResultPromise, ScanResult } from '../../responses/dynamodb.types';
import { ApiEvent, ApiHandler, ApiResponse } from '../../responses/api.types';
import ScanInput = DocumentClient.ScanInput;
import { JOURNEY_TABLE } from '../../constants/tables';

export class JourneyController {
  private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

  public allJourneys: ApiHandler = async (
    event: ApiEvent
  ): Promise<ApiResponse> => {
    try {
      const response: ScanResult = await this._getAllJourneys();

      return ResponseBuilder.ok({ success: true, journeys: response.Items });
    } catch (err) {
      return ResponseBuilder.internalServerError(err);
    }
  };

  private _getAllJourneys = (): GetResultPromise => {
    const params: ScanInput = {
      TableName: JOURNEY_TABLE,
      FilterExpression: 'journeyStatus = :status',
      ExpressionAttributeValues: {
        ':status': 'NOT_STARTED'
      }
    };

    return this.dynamo.scan(params).promise();
  };
}
