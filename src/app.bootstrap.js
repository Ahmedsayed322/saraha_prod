import express from 'express';
import { userRouter } from './modules/user/index.js';
import { GlobalErrorHandler, KnownErrorHandler } from './middlewares/index.js';
import { env } from './config/index.js';
import connectDb from './DB/mongoose.connection.js';
import { ApiError, asymmetric } from './utils/index.js';
import { resolve } from 'path';
import cors from 'cors';
import { redis_connection } from './DB/index.js';
import { messageRouter } from './modules/message/index.js';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { GlobalRateLimiter } from './utils/limiter/rate.limiter.js';
const bootstrap = async () => {
  const app = express();
  const { PORT } = env;
  await connectDb();
  await redis_connection();
  await asymmetric.runForFirstTime();
  const corsOption = {
    origin: (origin, cb) => {
      if (env.WHITE_LIST.includes(origin)) {
        cb(null, true);
      } else {
        cb(new ApiError('not allowed by cors', 403), false);
      }
    },
  };

  app.use(
    cors({
      ...corsOption,
    }),
    helmet(),
    GlobalRateLimiter,
    express.json(),
  );

  app.use('/users', userRouter);
  app.use('/messages', messageRouter);
  app.use(KnownErrorHandler, GlobalErrorHandler);
  app.use('/uploads', express.static(resolve('uploads')));
  app.use('{/dummy}', (req, res, next) => {
    res.status(404).json({ message: `this ${req.originalUrl} is not exist` });
  });
  app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
};
export default bootstrap;
