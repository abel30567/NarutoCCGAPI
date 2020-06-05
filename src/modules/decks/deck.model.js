import mongoose, { Schema } from 'mongoose';
import Card from '../posts/post.model';

const DeckSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    name: {
        type: String,
        trim: true,
        required: [true, 'Title is required!'],
    },
    image: {
        type: String,
        default: 'uploads/2019-02-25T04:59:56.476Z UNS3N-1685.jpg'
    },
    deck: [{
            type: Schema.Types.ObjectId,
            ref: 'Post'
    }]
},
{
    timestamps: true,
    usePushEach: true
});

DeckSchema.methods = {
    toJSON() {
        return {
            _id: this._id,
            user: this.user,
            name: this.name,
            image: this.image,
            deck: this.deck
        };
    },
};

export default mongoose.model('Deck', DeckSchema);
