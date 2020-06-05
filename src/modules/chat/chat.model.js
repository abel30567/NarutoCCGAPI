import mongoose, { Schema } from 'mongoose';
import Card from '../posts/post.model';

const ChatSchema = new Schema({
    chatFrom: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    chatTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    fromSocket: {
        type: String
    },
    toSocket: {
        type: String
    },
    conversation: [{
        user: { // This is the collector that owns
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
        message: String,
        read: {
            type: Boolean,
            default: false
        },
        createdOn: Date,
        attachment: {
            object_id: String, // user_id, chat_id, card url, image url
            object_type: String, // user, chat, card, image
        }
    }],
    unreadCount: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true,
    usePushEach: true
});

ChatSchema.pre('save', function (next) {
    if (this.isModified('conversation')) {
        let Acount = 0;
        this.conversation.forEach(message => {
            
            if (message.read == false && String(message.user._id) != String(this.chatFrom)) {
                Acount += 1;
            }
        })
      this.unreadCount = Acount;
      console.log('Went through count update');
    }
  
    return next();
  });

ChatSchema.methods = {
    toJSON() {
        this.conversation.sort((a,b) => { return b-a});
        return {
            _id: this._id,
            chatFrom: this.chatFrom,
            fromSocket: this.fromSocket,
            chatTo: this.chatTo,
            toSocket: this.toSocket,
            conversation: this.conversation.sort((a,b) => { return b-a}),
            unreadCount: this.unreadCount,
            updatedAt: this.updatedAt,
        };
    },
};

export default mongoose.model('Chat', ChatSchema);
