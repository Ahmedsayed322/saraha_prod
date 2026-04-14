import mongoose from 'mongoose';
import { dbService, USER } from '../../DB/index.js';
import MESSAGE from '../../DB/models/message.model.js';
import cloudinary from '../../utils/cloudinary/cloudinary.js';
import { ApiError } from '../../utils/index.js';
import {
  Decryption,
  Encryption,
} from '../../utils/security/asymmetricEncryption.security.js';

export const sendMessage = async ({ body, files }) => {
  const { content, receiverId } = body;
  const user = await dbService.findDocById(USER, { id: receiverId });
  if (!user) {
    throw new ApiError('user not found', 404);
  }
  let attachments = [];
  if (files.length) {
    for (const file of files) {
      const { secure_url, public_id } = await cloudinary.uploader.upload(
        file.path,
        {
          folder: 'messages/attachments',
          use_filename: true,
        },
      );
      attachments.push(secure_url);
    }
  }
  const encMessage = await Encryption(content);
  await dbService.createDoc(MESSAGE, {
    data: { content: encMessage, receiverId, attachments },
  });
  return;
};
export const getMessage = async ({ params, user }) => {
  const { id } = params;
  const message = await dbService.findDocById(MESSAGE, {
    id,
    receiverId: user._id,
  });
  if (!message) {
    throw new ApiError('message not found', 404);
  }

  message.content = await Decryption(message.content);
  return message;
};
export const getMessages = async ({ user }) => {
  const messages = await dbService.findAll(MESSAGE, {
    filter: {
      receiverId: user._id,
    },
  });

  let deMessages = [];


  for (const message of messages) {
    message.content = await Decryption(message.content);
    deMessages.push(message);
  }

  return deMessages;
};
