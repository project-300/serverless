import {
	Chat, ChatUser,
	LastEvaluatedKey,
	Message,
	PublishType, Subscription,
	User,
	UserBrief,
	UserConnection
} from '@project-300/common-types';
import {
	ApiContext,
	ApiEvent,
	ApiHandler,
	ApiResponse,
	ErrorCode,
	ResponseBuilder,
	SharedFunctions,
	UnitOfWork
} from '../../api-shared-modules/src';
import { ChatData } from './interfaces';
import SubscriptionManager from '../../api-websockets/src/pubsub/subscription';
import _ from 'lodash';
import PublicationManager from '../../api-websockets/src/pubsub/publication';
import API from '../../api-websockets/src/lib/api';

export class ChatController {

	private SubManager: SubscriptionManager;
	private PubManager: PublicationManager;

	public constructor(private unitOfWork: UnitOfWork) {
		this.SubManager = new SubscriptionManager(unitOfWork);
		this.PubManager = new PublicationManager(unitOfWork, new API());
	}

	public getAllChatsByUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.queryStringParameters || !event.queryStringParameters.deviceId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const deviceId: string = event.queryStringParameters.deviceId;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const chats: Chat[] = await this.unitOfWork.Chats.getAllByUser(userId);
			if (!chats) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Chats');

			const userWithConnections: Partial<User> = await this.unitOfWork.Users.getUserConnections(userId);
			const currentConnection: UserConnection =
				userWithConnections.connections && _.findLast(_.sortBy(userWithConnections.connections, [ 'connectedAt' ]),
				(con: UserConnection) => con.deviceId === deviceId
				);

			await Promise.all(chats.map(async (chat: Chat) => {
				chat.readableDurations = SharedFunctions.TimeDurations(chat.times);

				await this.SubManager.subscribe({
					subscriptionName: 'chats/list',
					itemType: 'chat',
					itemId: chat.chatId,
					connectionId: currentConnection.connectionId,
					deviceId,
					userId
				});

				return chat;
			}));

			return ResponseBuilder.ok({ chats });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, 'Unable to retrieve Chats');
		}
	}

	public getChatById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.chatId || !event.pathParameters.otherUserId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const { chatId, otherUserId }: { [name: string]: string } = event.pathParameters;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const chat: Chat = await this.unitOfWork.Chats.getById(chatId, [ userId, otherUserId ]);
			if (!chat) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Chat Not Found');

			return ResponseBuilder.ok({ chat });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, 'Unable to get Chat');
		}
	}

	public chatSubscribe: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.queryStringParameters || !event.queryStringParameters.otherUserId || !event.queryStringParameters.deviceId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const otherUserId: string = event.queryStringParameters.otherUserId;
		const chatId: string = event.queryStringParameters.chatId; // Optional value (for quicker retrieval)
		const deviceId: string = event.queryStringParameters.deviceId;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			if (userId === otherUserId) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'You cannot start a Chat with yourself');

			let chat: Chat = chatId ?
				await this.unitOfWork.Chats.getById(chatId, [ userId, otherUserId ]) :
				await this.unitOfWork.Chats.getByUsers([ userId, otherUserId ]);

			const thisUser: UserBrief = await this.unitOfWork.Users.getUserBrief(userId);
			if (!thisUser) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'User does not exist');

			if (!chat) {
				const userB: UserBrief = await this.unitOfWork.Users.getUserBrief(otherUserId);
				if (!userB) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Recipient user does not exist');

				chat = await this.unitOfWork.Chats.create({ users: [ { ...thisUser, unreadCount: 0 }, { ...userB, unreadCount: 0 } ] });
				if (!chat) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'Failed to create new Chat');
			} else {
				chat.users = chat.users.map((u: ChatUser) => {
					if (u.userId === userId) u.unreadCount = 0;
					return u;
				});

				chat = await this.unitOfWork.Chats.update(chatId, chat);
			}

			const userWithConnections: Partial<User> = await this.unitOfWork.Users.getUserConnections(userId);
			const currentConnection: UserConnection =
				userWithConnections.connections && _.findLast(_.sortBy(userWithConnections.connections, [ 'connectedAt' ]),
				(con: UserConnection) => con.deviceId === deviceId
			);

			if (chat) {
				const currentChatSub: Subscription[] =
					await this.unitOfWork.Subscriptions.getByType('chat/messages', currentConnection.connectionId, userId);

				await Promise.all(currentChatSub.map(async (sub: Subscription) =>
					this.unitOfWork.Subscriptions.delete(sub.subscriptionId, sub.itemType, sub.itemId, sub.connectionId)
			  	));

				await this.SubManager.subscribe({
					subscriptionName: 'chat/messages',
					itemType: 'chat',
					itemId: chat.chatId,
					connectionId: currentConnection.connectionId,
					deviceId,
					userId: thisUser.userId
				});

				const messageData: Partial<{ messages: Message[]; lastEvaluatedKey?: LastEvaluatedKey; chatId: string }> =
					await this.unitOfWork.Messages.getAllByChat(chat.chatId);
				if (!messageData) throw Error('Unable to retrieve chat messages');

				messageData.messages = SharedFunctions.setMessageFlags(userId, messageData.messages);
				messageData.chatId = chat.chatId;

				chat = SharedFunctions.markOwnUserChats(userId, [ chat ])[0];

				await this.PubManager.publishCRUD({
					subscriptionName: 'chats/list',
					itemType: 'chat',
					itemId: chatId,
					data: { chat },
					sendAsCollection: true,
					publishType: PublishType.UPDATE
				});

				await this.PubManager.publishToSingleConnection({
					subscriptionName: 'chat/messages',
					itemType: 'chat',
					itemId: chat.chatId,
					connectionId: currentConnection.connectionId,
					data: messageData,
					sendAsCollection: true,
					publishType: PublishType.QUERY
				});
			}

			return ResponseBuilder.ok({ chat });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, 'Unable to get Chat');
		}
	}

	public chatUnsubscribe: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.otherUserId || !event.pathParameters.deviceId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const otherUserId: string = event.pathParameters.otherUserId;
		const deviceId: string = event.pathParameters.deviceId;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const chat: Chat = await this.unitOfWork.Chats.getByUsers([ userId, otherUserId ]);

			const userWithConnections: Partial<User> = await this.unitOfWork.Users.getUserConnections(userId);
			const currentConnection: UserConnection =
				userWithConnections.connections && _.findLast(_.sortBy(userWithConnections.connections, [ 'connectedAt' ]),
				(con: UserConnection) => con.deviceId === deviceId
			);

			if (chat) {
				await this.SubManager.unsubscribe({
					subscriptionName: 'chat/messages',
					itemType: 'chat',
					itemId: chat.chatId,
					connectionId: currentConnection.connectionId,
					deviceId,
					userId
				});
			}

			return ResponseBuilder.ok({ });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, 'Unable to unsubscribe from Chat');
		}
	}

	public markMessagesRead: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.otherUserId || !event.pathParameters.chatId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const otherUserId: string = event.pathParameters.otherUserId;
		const chatId: string = event.pathParameters.chatId;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			let chat: Chat = await this.unitOfWork.Chats.getById(chatId, [ userId, otherUserId ]);

			chat.users = chat.users.map((u: ChatUser) => {
				if (u.userId === userId) u.unreadCount = 0;
				return u;
			});

			chat = await this.unitOfWork.Chats.update(chatId, chat);

			if (chat) {
				await this.PubManager.publishCRUD({
					subscriptionName: 'chats/list',
					itemType: 'chat',
					itemId: chatId,
					data: { chat },
					sendAsCollection: true,
					publishType: PublishType.UPDATE
				});
			}

			return ResponseBuilder.ok({ });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, 'Unable to unsubscribe from Chat');
		}
	}

	public createChat: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const data: ChatData = JSON.parse(event.body);

		if (!data.otherUserId) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const otherUserId: string = data.otherUserId;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const existingChat: Chat = await this.unitOfWork.Chats.getByUsers([ userId, otherUserId ]);
			if (existingChat) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Chat between users already exists');

			const userA: UserBrief = await this.unitOfWork.Users.getUserBrief(userId);
			const userB: UserBrief = await this.unitOfWork.Users.getUserBrief(otherUserId);

			if (!userB) return ResponseBuilder.notFound(ErrorCode.BadRequest, 'Other user does not exist');

			const chat: Partial<Chat> = {
				users: [ { ...userA, unreadCount: 0 }, { ...userB, unreadCount: 0 } ]
			};

			const result: Chat = await this.unitOfWork.Chats.create({ ...chat });
			if (!result) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'Failed to create new Chat');

			return ResponseBuilder.ok({ chat: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to create a new Chat');
		}
	}

	public updateChat: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const data: ChatData = JSON.parse(event.body);

		if (!data.chat) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const chat: Partial<Chat> = data.chat;

		try {
			SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			if (!chat.chatId) throw Error('Chat ID is missing');

			const chatCheck: Chat = await this.unitOfWork.Chats.getById(chat.chatId, chat.users.map((user: UserBrief) => user.userId));
			if (!chatCheck) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Chat Not Found');

			const result: Chat = await this.unitOfWork.Chats.update(chat.chatId, { ...chat });
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Chat Not Found');

			return ResponseBuilder.ok({ chat: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to update Chat');
		}
	}

	public deleteChat: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.chatId || !event.pathParameters.otherUserId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const { chatId, otherUserId }: { [name: string]: string } = event.pathParameters;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const result: Chat = await this.unitOfWork.Chats.delete(chatId, [ userId, otherUserId ]);
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Chat Not Found');

			return ResponseBuilder.ok({ chat: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

}
