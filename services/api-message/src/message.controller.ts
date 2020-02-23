import { Message, UserBrief } from '@project-300/common-types';
import {
	ResponseBuilder,
	ErrorCode,
	ApiResponse,
	ApiHandler,
	ApiEvent,
	ApiContext,
	UnitOfWork, SharedFunctions
} from '../../api-shared-modules/src';
import { MessageData } from './interfaces';

export class MessageController {

	public constructor(private unitOfWork: UnitOfWork) { }

	public getAllMessagesByChat: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.chatId)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const chatId: string = event.pathParameters.chatId;

		try {
			SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const messages: Message[] = await this.unitOfWork.Messages.getAllByChat(chatId);
			if (!messages) return ResponseBuilder.notFound(ErrorCode.GeneralError, 'Failed to retrieve Messages');

			return ResponseBuilder.ok({ messages });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, 'Unable to retrieve Messages');
		}
	}

	public getMessageById: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.chatId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const { chatId, createdAt }: { [name: string]: string } = event.pathParameters;

		try {
			SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const message: Message = await this.unitOfWork.Messages.getById(chatId, createdAt);
			if (!message) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Message Not Found');

			return ResponseBuilder.ok({ message });
		} catch (err) {
			console.log(err);
			return ResponseBuilder.internalServerError(err, 'Unable to get Message');
		}
	}

	public createMessage: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.body) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request body');

		const data: MessageData = JSON.parse(event.body);

		if (!data.message) return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const message: Partial<Message> = data.message;

		try {
			if (!message.chatId) throw Error('Message is not associated with a chat');
			if (!message.text) throw Error('Message body cannot be empty');

			const userId: string = SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const user: UserBrief = await this.unitOfWork.Users.getUserBrief(userId);
			message.createdBy = user;

			const result: Message = await this.unitOfWork.Messages.create({ ...message });
			if (!result) return ResponseBuilder.badRequest(ErrorCode.GeneralError, 'Failed to create new Message');

			return ResponseBuilder.ok({ message: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err, err.message || 'Unable to create a new Message');
		}
	}

	public deleteMessage: ApiHandler = async (event: ApiEvent, context: ApiContext): Promise<ApiResponse> => {
		if (!event.pathParameters || !event.pathParameters.chatId || !event.pathParameters.createdAt)
			return ResponseBuilder.badRequest(ErrorCode.BadRequest, 'Invalid request parameters');

		const { chatId, createdAt }: { [name: string]: string } = event.pathParameters;

		try {
			SharedFunctions.getUserIdFromAuthProvider(event.requestContext.identity.cognitoAuthenticationProvider);

			const result: Message = await this.unitOfWork.Messages.delete(chatId, createdAt);
			if (!result) return ResponseBuilder.notFound(ErrorCode.InvalidId, 'Message Not Found');

			return ResponseBuilder.ok({ message: result });
		} catch (err) {
			return ResponseBuilder.internalServerError(err);
		}
	}

}
