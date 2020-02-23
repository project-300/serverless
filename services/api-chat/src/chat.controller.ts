import { Chat, UserBrief } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork, SharedFunctions
} from '../../api-shared-modules/src';
import { ChatData } from './interfaces';

export class ChatController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public getAllChatsByUser: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const chats: Chat[] = await this.unitOfWork.Chats.getAllByUser(userId);
			if (!chats) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Chats');

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

	public getChatByUsers: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.otherUserId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const otherUserId: string = event.pathParameters.otherUserId;

		try {
			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			if (userId === otherUserId) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'You cannot start a Chat with yourself');

			let chat: Chat = await this.unitOfWork.Chats.getByUsers([ userId, otherUserId ]);

			if (!chat) {
				const userA: UserBrief = await this.unitOfWork.Users.getUserBrief(userId);
				const userB: UserBrief = await this.unitOfWork.Users.getUserBrief(otherUserId);
				if (!userA || !userB) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'User does not exist');

				chat = await this.unitOfWork.Chats.create({ users: [ userA, userB ] });
				if (!chat) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'Failed to create new Chat');
			}

			return ResponseBuilder.ok({ chat });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, 'Unable to get Chat');
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

			const chat: Partial<Chat> = {
				users: [ userA, userB ]
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
