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
import GetItemInput = DocumentClient.GetItemInput;
import { JOURNEY_TABLE, USER_TABLE } from '../../constants/tables';
import { JOURNEY_INDEX, USERS_INDEX } from '../../constants/indexes';
import { JourneyErrorChecks } from './journey.interfaces';
// import { Journey } from '@project-300/common-types';

export class JourneyController {
  private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

  public userJoinedJourney: ApiHandler = async (
    event: ApiEvent
  ): Promise<ApiResponse> => {
    const data = JSON.parse(event.body);
    const { userId, journey } = data;

    try {
      const isValid = await this._journeyErrorChecks(journey.journeyId, userId);

      if (isValid.result) {
        await this._updateJourney(journey.journeyId, userId);
        await this._updateJourneyAsPassenger(journey.journeyId, userId);

        return ResponseBuilder.ok({ success: true });
      }

      return ResponseBuilder.internalServerError(
        Error('Unable to update journey'),
        isValid.errorDescription
      );
    } catch (err) {
      return ResponseBuilder.internalServerError(
        err,
        'Unable to update journey'
      );
    }
  };

  private _journeyErrorChecks = async (
    journeyId: string,
    userId: string
  ): Promise<JourneyErrorChecks> => {
    try {
      const { Item: journey } = await this._getJourney(journeyId);

      if (journey.seatsLeft <= 0) {
        return { result: false, errorDescription: 'No Seats Available' };
      }

      if (journey.driver.userId === userId) {
        return {
          result: false,
          errorDescription: 'Driver cannot join own journey'
        };
      }

      if (journey.passengers.includes(userId)) {
        return {
          result: false,
          errorDescription: 'User is already a passenger'
        };
      }

      return { result: true };
    } catch (err) {
      return {
        result: false,
        errorDescription: err.description
      };
    }
  };

  private _getJourney = (journeyId: string): GetResultPromise => {
    const params: GetItemInput = {
      TableName: JOURNEY_TABLE,
      Key: {
        [JOURNEY_INDEX]: journeyId
      }
    };

    return this.dynamo.get(params).promise();
  };

  private _updateJourneyAsPassenger = (journeyId, userId): UpdateResult => {
    const params: UpdateItemInput = {
      TableName: USER_TABLE,
      Key: {
        [USERS_INDEX]: userId
      },
      UpdateExpression:
        'set journeysAsPassenger = list_append(journeysAsPassenger, :journeyId)',
      ExpressionAttributeValues: {
        ':journeyId': [journeyId]
      },
      ReturnValues: 'UPDATED_NEW'
    };
    return this.dynamo.update(params).promise();
  };

  private _updateJourney = (
    journeyId: string,
    userId: string
  ): UpdateResult => {
    const params: UpdateItemInput = {
      TableName: JOURNEY_TABLE,
      Key: {
        [JOURNEY_INDEX]: journeyId
      },
      UpdateExpression:
        'set seatsLeft = seatsLeft - :seat, passengers = list_append(passengers, :newPassenger)',
      ExpressionAttributeValues: {
        ':seat': 1,
        ':newPassenger': [userId]
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
      // const journeys = response.Items.sort(
      //   (a, b) => new Date(b.times.createdAt) - new Date(a.times.createdAt)
      // );
      const journeys = response.Items;

      return ResponseBuilder.ok({ success: true, journeys });
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
