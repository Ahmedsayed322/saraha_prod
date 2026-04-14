import Joi from 'joi';

const customId = Joi.string().hex().length(24).required().messages({
  'string.hex': 'invalid userId',
  'string.length': 'invalid userId Length',
  'any.required': 'userid is required',
});
export const sendMessageValidation = Joi.object({
  body: Joi.object({
    receiverId: customId,
    content: Joi.string().required(),
    attachments: Joi.array().items(),
  })
    .required()
    .messages({
      'any.required': 'body is required',
    }),
});
