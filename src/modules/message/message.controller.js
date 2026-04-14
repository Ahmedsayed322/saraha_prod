import { Router } from 'express';
import { getMessage, getMessages, sendMessage } from './message.service.js';
import { successResponse } from '../../utils/index.js';
import { fileUploader_cloudinary } from '../../middlewares/upload/multer.js';
import { Validation } from '../../middlewares/validation/validation.js';
import { sendMessageValidation } from './message.validation.js';
import { authentication } from '../../middlewares/auth/user.auth.js';

const router = Router();
router.post(
  '/send',
  fileUploader_cloudinary().array('attachments', 3),
  Validation(sendMessageValidation),
  async (req, res, next) => {
    await sendMessage(req);
    return successResponse(res, {
      message: 'message sent successfully',
      statusCode: 201,
    });
  },
);
router.get('/', authentication, async (req, res, next) => {
  const messages = await getMessages(req);
  return successResponse(res, {
    message: 'done',
    statusCode: 200,
    data: { messages },
  });
});
router.get('/:id', authentication, async (req, res, next) => {
  const message = await getMessage(req);
  return successResponse(res, {
    message: 'done',
    statusCode: 200,
    data: { message },
  });
});
export default router;
