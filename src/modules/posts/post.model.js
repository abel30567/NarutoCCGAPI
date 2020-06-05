import mongoose, { Schema } from 'mongoose';

import User from '../users/user.model';

const PostSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, 'Name is required!'],
    },
    cardNumber: String,
    image: {
      type: String,
      // required: true,
    },
    cardType: {
      type: String,
      trim: true,
    },
    symbol: Array,
    characteristic: Array,
    handCost: {
      type: String,
    },
    entranceCost: {
      type: Number,
    },
    effectName: {
      type: String,
      trim: true,
    },
    combatAttr: {
      type: String,
      trim: true,
    },
    cardSet: {
      type: String,
      trim: true,
    },
    healthy: {
      type: String,
      trim: true,
    },
    injured: {
      type: String,
      trim: true,
    },
    jutsuCost: Array,
    text: { // description
      type: String,
      trim: true,
    },
    rarity: { type: String, required: true },
    owned: [{
      amount: String,
      value: Number,
      user: { // This is the collector that owns
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      forSale: {
        type: Boolean,
        default: true
      }
    }],
    wanted: [{
      amount: String,
      value: Number,
      user: { // This is the collector that owns
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      forSale: {
        type: Boolean,
        default: true
      }
    }]
  },
  { timestamps: true,
    usePushEach: true }
);

// PostSchema.plugin(uniqueValidator, {
//   message: '{VALUE} already taken!',
// });

PostSchema.methods = {
  toJSON() {
    return {
      _id: this._id,
      cardType: this.cardType,
      name: this.name,
      image: this.image,
      symbol: this.symbol,
      characteristic: this.characteristic,
      entranceCost: this.entranceCost,
      handCost: this.handCost,
      combatAttr: this.combatAttr,
      effectName: this.effectName,
      text: this.text,
      healthy: this.healthy,
      injured: this.injured,
      jutsuCost: this.jutsuCost,
      cardSet: this.cardSet,
      cardNumber: this.cardNumber,
      createdAt: this.createdAt,
      rarity: this.rarity,
      owned: this.owned,
      wanted: this.wanted
    };
  },  
};

PostSchema.statics = {
  createPost(args) {
    return this.create({
      args,
    });
  },
  list({ skip = 0, limit = 20 } = {}) {
    return this.find()
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
  },
};

export default mongoose.model('Post', PostSchema);

