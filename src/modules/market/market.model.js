import mongoose, { Schema } from 'mongoose';

import User from '../users/user.model';

const MarketSchema = new Schema(
  {
    type: String,
    card: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
    },
    amount: String,
    value: Number,
    user: { // This is the owner of action that owns
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    forSale: {
        type: Boolean,
        default: true
    }
    },
  { timestamps: true,
    usePushEach: true }
);

// PostSchema.plugin(uniqueValidator, {
//   message: '{VALUE} already taken!',
// });

MarketSchema.methods = {
  toJSON() {
    return {
      _id: this._id,
      type: this.type,
      amount: this.amount,
      value: this.value,
      user: this.user,
      forSale: this.forSale
    };
  },  
};

export default mongoose.model('Market', MarketSchema);
