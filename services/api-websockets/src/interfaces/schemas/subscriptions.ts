import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { ConnectionItem } from '../../interfaces';

export interface SubscriptionSchema extends DocumentClient.AttributeMap {
	subscriptionName: string;
	connections: ConnectionItem[];
}
