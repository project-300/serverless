import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ResponseBuilder } from '../../responses/response-builder';
import {
  GetResultPromise,
  ScanResult,
  UpdateResult
} from '../../responses/dynamodb.types';
import { ApiEvent, ApiHandler, ApiResponse } from '../../responses/api.types';
import ScanInput = DocumentClient.ScanInput;
import UpdateItemInput = DocumentClient.UpdateItemInput;
import { JOURNEY_TABLE } from '../../constants/tables';
import { JOURNEY_INDEX } from '../../constants/indexes';

export class JourneyController {
  private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

  public userJoinedJourney: ApiHandler = async (
    event: ApiEvent
  ): Promise<ApiResponse> => {
    const data = JSON.parse(event.body);

    if (data.seatsLeft <= 0) {
      return ResponseBuilder.internalServerError(
        Error('No Seats Available'),
        'Unable to update journey'
      );
    }

    if (data.journey.driver.userId === data.userId) {
      return ResponseBuilder.internalServerError(
        Error('Driver cannot join own journey'),
        'Unable to update journey'
      );
    }

    try {
      await this._updateJourney(data.journey.journeyId, data.userId);

      return ResponseBuilder.ok({ success: true });
    } catch (err) {
      return ResponseBuilder.internalServerError(
        err,
        'Unable to update journey'
      );
    }
  };

  private _updateJourney = (journeyId, userId): UpdateResult => {
    const params: UpdateItemInput = {
      TableName: JOURNEY_TABLE,
      Key: {
        [JOURNEY_INDEX]: journeyId
      },
      UpdateExpression:
        'set seatsLeft - :seat, passengers = list_append(passengers, :newPassenger)',
      ExpressionAttributeValues: {
        ':seat': 1,
        ':newPassenger': userId
      },
      ReturnValues: 'UPDATED_NEW'
    };

    return this.dynamo.update(params).promise();
  };

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
      FilterExpression: 'journeyStatus = :status and seatsLeft > :value',
      ExpressionAttributeValues: {
        ':status': 'NOT_STARTED',
        ':value': 0
      }
    };

    return this.dynamo.scan(params).promise();
  };
}
