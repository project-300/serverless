import { CollectionItem, SubscriptionConnection, SubscriptionPayload } from '@project-300/common-types';
import { PublishType } from '@project-300/common-types/lib/enums';
import API from '../lib/api';
import { WsPostResult, UnitOfWork } from '../../../api-shared-modules/src';

export interface PublicationData {
	subscriptionName: string; // driver-applications, user/profile, etc
	itemType: string; // journey, user, application, subscription, etc
	itemId: string; // hash id
	connectionId?: string; // websocket connection id
	data: CollectionItem | CollectionItem[] | string; // user hash id
	sendAsCollection: boolean; // Send individually or as a collection
	publishType?: PublishType; // Only used for CRUD operations
}

export default class PublicationManager {

	public constructor(
		private unitOfWork: UnitOfWork,
		private api: API
	) { }

	public publishToSingleConnection = async (publicationData: PublicationData): Promise<void> => {
		publicationData.publishType = publicationData.publishType || PublishType.QUERY;

		await this._sendToConnections([ publicationData.connectionId ], publicationData);
	}

	public publishCRUD = async (publicationData: PublicationData): Promise<void> => {
		const connectionIds: string[] = await this._getConnectionIds(
			publicationData.subscriptionName,
			publicationData.itemType,
			publicationData.itemId
		);
		await this._sendToConnections(connectionIds, publicationData);
	}

	public publishSingleNotification = async (connectionId: string, notification: string): Promise<void> => {
		await this.api.post({
			subscriptionName: 'notification',
			itemType: 'notification',
			itemId: 'N/A',
			connectionId
		}, { data: { notification } });
	}

	private _getConnectionIds = async (subscriptionName: string, itemType: string, itemId: string): Promise<string[]> => {
		const subscriptionConnections: SubscriptionConnection[] =
			await this.unitOfWork.Subscriptions.getConnections(subscriptionName, itemType, itemId);
		return subscriptionConnections.map((con: SubscriptionConnection) => con.connectionId);
	}

	private _sendToConnections = async (connectionIds: string[], publicationData: PublicationData): Promise<void> => {
		if (!connectionIds.length) return;

		const { sendAsCollection, data }: Partial<PublicationData> = publicationData;

		await Promise.all(connectionIds.map(async (connectionId: string) => {
			publicationData.connectionId = connectionId;

			if (!sendAsCollection && data instanceof Array) {
				data.forEach((item: CollectionItem | string) => {
					this._sendDataObject(publicationData, this._createPayload({
						...publicationData,
						data: item
					}));
				});
			} else {
				await this._sendDataObject(publicationData, this._createPayload(publicationData));
			}
		}));
	}

	private _createPayload = (publicationData: PublicationData): SubscriptionPayload => {
		const { subscriptionName, itemType, itemId, publishType, data, sendAsCollection }: PublicationData = publicationData;
		return {
			subscription: subscriptionName,
			type: publishType,
			itemType,
			itemId,
			data,
			isCollection: sendAsCollection
		};
	}

	private _sendDataObject = async (publicationData: PublicationData, data: SubscriptionPayload): Promise<WsPostResult> => {
		const { subscriptionName, itemType, itemId, connectionId }: Partial<PublicationData> = publicationData;

		await this.api.post({
			subscriptionName,
			itemType,
			itemId,
			connectionId
		}, data);
	}

}
