import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ConnectionItem } from '../../$connect/connect.interfaces';

export interface SubscriptionSchema extends DocumentClient.AttributeMap {
	subscriptionName: string;
	connections: ConnectionItem[];
}
