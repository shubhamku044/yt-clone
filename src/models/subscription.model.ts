import { model, Document, Schema, Types, Model } from 'mongoose';

interface ISubscriptionDocument extends Document {
  subscriber: Types.ObjectId;
  channel: Types.ObjectId;
}

interface ISubscription extends ISubscriptionDocument { }
interface ISubscriptionModel extends Model<ISubscription> { }

const subscriptionSchema = new Schema<ISubscriptionDocument>({
  subscriber: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  channel: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export const Subscription: ISubscriptionModel =
  model<ISubscription, ISubscriptionModel>('Subscription', subscriptionSchema);
