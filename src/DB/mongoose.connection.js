import { connect } from 'mongoose';
import { env } from '../config/index.js';
const connectDb = () => {
  const { DB_NAME, MONGOOSE_URI, NODE_ENV } = env;
  return connect(MONGOOSE_URI, {
    serverSelectionTimeoutMS: 5000,
  })
    .then(() => {
      console.error(`success to connect saraha app`);
    })
    .catch((e) => {
      console.error(
        `failed to connect saraha app`,
        NODE_ENV === 'development' ? e : '',
      );
    });
};

export default connectDb;
