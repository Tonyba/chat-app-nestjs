import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { instanceToPlain } from 'class-transformer';
import { Repository } from 'typeorm';
import { Conversation, Message } from '../utils/typeorm';
import { CreateMessageParams, DeleteMessageParams } from '../utils/types';
import { IMessageService } from './message';

@Injectable()
export class MessageService implements IMessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}
  async createMessage({ user, content, conversationId }: CreateMessageParams) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['creator', 'recipient', 'lastMessageSent'],
    });
    if (!conversation)
      throw new HttpException('Conversation not found', HttpStatus.BAD_REQUEST);
    const { creator, recipient } = conversation;
    console.log(`User ID: ${user.id}`);
    console.log(conversation);
    if (creator.id !== user.id && recipient.id !== user.id)
      throw new HttpException('Cannot Create Message', HttpStatus.FORBIDDEN);

    const message = this.messageRepository.create({
      content,
      conversation,
      author: instanceToPlain(user),
    });
    const savedMessage = await this.messageRepository.save(message);
    conversation.lastMessageSent = savedMessage;
    const updatedConversation = await this.conversationRepository.save(
      conversation,
    );
    return { message: savedMessage, conversation: updatedConversation };
  }

  getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return this.messageRepository.find({
      relations: ['author'],
      where: { conversation: { id: conversationId } },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteMessage(params: DeleteMessageParams) {
    console.log(params);

    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .where('id = :conversationId', { conversationId: params.conversationId })
      .leftJoinAndSelect('conversation.lastMessageSent', 'lastMessageSent')
      .leftJoinAndSelect('conversation.messages', 'message')
      .where('conversation.id = message.conversationId')
      .limit(5)
      .orderBy('message.createdAt', 'DESC')
      .getOne();

    if (!conversation)
      throw new HttpException('Conversation not found', HttpStatus.BAD_REQUEST);

    const message = await this.messageRepository.findOne({
      id: params.messageId,
      author: {
        id: params.userId,
      },
      conversation: { id: params.conversationId },
    });

    if (!message)
      throw new HttpException('Cannot delete message', HttpStatus.BAD_REQUEST);

    if (conversation.lastMessageSent.id !== message.id)
      return this.messageRepository.delete({ id: message.id });

    // Deleting Last Message
    const size = conversation.messages.length;
    const SECOND_MESSAGE_INDEX = 1;
    if (size <= 1) {
      await this.conversationRepository.update(
        { id: params.conversationId },
        {
          lastMessageSent: null,
        },
      );
      await this.messageRepository.delete({ id: message.id });
    } else {
      const newLastMessage = conversation.messages[SECOND_MESSAGE_INDEX];
      await this.conversationRepository.update(
        { id: params.conversationId },
        {
          lastMessageSent: newLastMessage,
        },
      );
      await this.messageRepository.delete({ id: message.id });
    }
  }
}