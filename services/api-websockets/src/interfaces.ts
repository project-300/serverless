import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';

export interface ConnectResult {
	success: boolean;
}

export interface ConnectionItem extends DocumentClient.AttributeMap {
	connectionId: string;
	userId: string;
	subscribedAt: string;
}

export interface DefaultResult {
	success: boolean;
}

export interface DisconnectResult {
	success: boolean;
}
