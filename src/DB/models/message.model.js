import { model, Schema } from 'mongoose';

const schema = new Schema(
  {
    receiverId: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    content: { type: String, required: true },
    attachments: [{ type: String }],
  },
  { timestamps: true, strictQuery: true },
);

const MESSAGE = model('message', schema);
export default MESSAGE;
