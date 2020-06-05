import mongoose, { Schema } from 'mongoose';
import validator from 'validator';
import Mixpanel from 'mixpanel';

import { hashSync, compareSync } from 'bcrypt-nodejs';
import jwt from 'jsonwebtoken';
import uniqueValidator from 'mongoose-unique-validator';
import Authy from 'authy';
import twilio from 'twilio';
import fs from 'fs';
import request from 'request';
import constans from '../../config/constants';


import Post from '../posts/post.model';

import { passwordReg } from './user.validation';
import constants from '../../config/constants';

// const twilioClient = twilio(constants.TWILIO_ACCOUNT_SID, constants.TWILIO_AUTH_TOKEN);
// const authy = Authy(constants.AUTHY_KEY);

const mixpanel = Mixpanel.init('6355b9138ef99a42321be6306756111e');

const UserSchema = new Schema(
  {
    name: String,
    type: { type: String, default: 'individual', enum: ['individual', 'company'] },
    email: {
      type: String,
      unique: true,
      required: [true, 'Email is required!'],
      trim: true,
      validate: {
        validator(email) {
          return validator.isEmail(email);
        },
        message: '{VALUE} is not a valid email!',
      },
    },
    userName: {
      type: String,
      required: [true, 'UserName is required!'],
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required!'],
      trim: true,
      minlength: [6, 'Password need to be longer!'],
      validate: {
        validator(password) {
          return passwordReg.test(password);
        },
        message: '{VALUE} is not a valid password!',
      },
    }, // Social
    image: {
      type: String,
      
    },
    location: String,
    facebookProvider: {
      type: {
        id: String,
        token: String,
      },
      select: false,
    },
    googleProvider: {
      type: {
        id: String,
        token: String,
      },
      select: false,
    },
    fcmToken: {
      type: String
    },
    lastActive: Date,
  },
  { timestamps: true,
    usePushEach: true }
);

UserSchema.plugin(uniqueValidator, {
  message: '{VALUE} already taken!',
});

UserSchema.pre('save', function (next) {
  if (this.isModified('type')) {
    if (this.type === 'individual') {
      this.businessName = null;
    } else {
      this.name = null;
    }
  }
  if (this.isModified('password')) {
    this.password = this._hashPassword(this.password);
  }

  return next();
});

/*
* Twilio verification https://www.twilio.com/docs/authy/tutorials/account-verification-node-express
*/
UserSchema.statics.upsertFbUser = function (accessToken, refreshToken, profile, cb) {

  const download = function (uri, filename, callback) {
    request.head(uri, (err, res, body) => {
      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
  };
  const that = this;
  return this.findOne({
    'facebookProvider.id': profile.id,
  }, (err, user) => {
    // console.log(user);
    // no user was found, lets create a new one
    if (!user) {
      
      download(profile.photos[0].value, `./uploads/${profile.emails[0].value}.jpg`, () => {
        const newUser = new that({
          name: profile.displayName,
          email: profile.emails[0].value,
          userName: profile.emails[0].value,
          password: `${profile.emails[0].value + profile.displayName}A007`,
          image: `uploads/${profile.emails[0].value}.jpg`,
          facebookProvider: {
            id: profile.id,
            token: accessToken,
          },
        });
        mixpanel.track('New User', {
          distinct_id: newUser._id,
        });
        mixpanel.people.set({
          $name: profile.displayName,
          '$email': profile.emails[0].value,
          $createdAt: newUser.createdAt,
          $last_login: new Date(),
        });
        newUser.save((error, savedUser) => {
          if (error) {
            console.log(error);
          }
          return cb(error, savedUser);
        });
      });
    } else {
      return cb(err, user);
    }
  });
};

UserSchema.statics.upsertGoogleUser = function (accessToken, refreshToken, profile, cb) {
  console.log(profile);
  const download = function (uri, filename, callback) {
    request.head(uri, (err, res, body) => {
      console.log('content-type:', res.headers['content-type']);
      console.log('content-length:', res.headers['content-length']);
      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
  };
  const that = this;
  return this.findOne({
    'googleProvider.id': profile.id,
  }, (err, user) => {
    // no user was found, lets create a new one
    if (!user) {
      download(profile._json.picture, `./uploads/${profile.emails[0].value}.jpg`, () => {
        const newUser = new that({
          name: profile.displayName,
          email: profile.emails[0].value,
          userName: profile.emails[0].value,
          password: `${profile.emails[0].value + profile.displayName  }A007`,
          image: `uploads/${profile.emails[0].value}.jpg`,
          googleProvider: {
            id: profile.id,
            token: accessToken,
          },
        });
  
        newUser.save((error, savedUser) => {
          if (error) {
            console.log(error);
          }
          return cb(error, savedUser);
        });
      });   
    } else {
      return cb(err, user);
    }
  });
};

UserSchema.methods = {
  _hashPassword(password) {
    return hashSync(password);
  },
  authenticateUser(password) {
    return compareSync(password, this.password);
  },
  createToken() {
    return jwt.sign(
      {
        _id: this._id,
        username: this.userName,
        profilePic: this.image,
      },
      constants.JWT_SECRET,
    );
  },
  toAuthJSON() {
    return {
      _id: this._id,
      userName: this.userName,
      token: `JWT ${this.createToken()}`,
    };
  },
  editProfile() {
    return {
      name: this.name,
      userName: this.userName,
      bio: this.bio,
      token: `JWT ${this.createToken()}`,
    };
  },
  editProfileImages() {
    return {
      image: this.image,
      backgroundPicture: this.backgroundPicture,
    };
  },
  editAccount() {
    return {
      email: this.email,
      phoneNumber: this.phoneNumber,
      address: {
        street1: this.address.street1,
        street2: this.address.street2,
        city: this.address.city,
        state: this.address.state,
        zip: this.address.zip,
        country: this.address.country,
      },
    };
  },
  toJSON() {
    return {
      _id: this._id,
      userName: this.userName,
      picture: this.image,
      location: this.location,
      lastActive: this.lastActive,
      createdAt: this.updatedAt,
    };
  },
  toGuestProfileJSON() { // user is user that is searching a profile
    return {
      _id: this._id,
      userName: this.userName,
      name: this.name,
      bio: this.bio,
      image: this.image,
      backgroundPicture: this.backgroundPicture,
      rating: this.sellerRating,
      following: false,
      isFollowing: this.following,
      followers: this.followers,
    };
  },
  toProfileJSON(user) { // user is user that is searching a profile
    return {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      phoneNumber: this.phoneNumber,
      address: {
        street1: this.address.street1,
        street2: this.address.street2,
        city: this.address.city,
        state: this.address.state,
        zip: this.address.zip,
        country: this.address.country,
      },
      createdAt: this.createdAt,
      stripeAccountId: this.stripeAccountId,
      name: this.name,
      bio: this.bio,
      image: this.image,
      backgroundPicture: this.backgroundPicture,
      following: user ? user._follow.isFollowing(this._id) : false,
      isFollowing: this.following,
      followers: this.followers,
      notificationCount: this.notificationCount,
      stripeCustomerId: this.stripeCustomerId,
      observedFollowers: this.observedFollowers,
      shared: this.shared,
    };
  },
  toSearchJSON(user) { // user is user that is searching
    return {
      _id: this._id,
      name: this.name,
      userName: this.userName,
      bio: this.bio,
      rating: this.sellerRating,
      image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
      following: user ? user._follow.isFollowing(this._id) : false,
    };
  },
  toGuestSearchJSON() { // user is user that is searching
    return {
      _id: this._id,
      name: this.name,
      userName: this.userName,
      bio: this.bio,
      rating: this.sellerRating,
      image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
      following: false,
    };
  },
  toSignUp() {
    return {
      email: this.email,
    };
  },
  toStripeJSON() {
    return {
      _id: this._id,
      userName: this.userName,
      name: this.name,
      stripeAccountId: this.stripeAccountId,
    };
  },
  toPayoutJSON() {
    return {
      _id: this._id,
      userName: this.userName,
      name: this.name,
      stripeAccountId: this.stripeAccountId,
      pendingFunds: 'TBD',
    };
  },
  perShare() {
    return {
      _id: this._id,
      shares: this.shared.posts.length,
    };
  },
  perFollowers() {
    return {
      _id: this._id,
      followers: this.followers.length,
    };
  },
  perTransaction() {
    return {
      _id: this._id,
      transactions: this.purchaseHistory.length,
    };
  },
  _follow: {
    follow(userId) {
      if (this.following.indexOf(userId) === -1) {
        this.following.push(userId);
      }
      return this.save();
    },
    unfollow(userId) {
      this.following.remove(userId);
      return this.save();
    },
    isFollowing(userId) {
      return this.following.some((followId) => followId.toString() === userId.toString());
    },
  },

  _favorites: {
    async posts(postId) {
      if (this.favorites.posts.indexOf(postId) >= 0) {
        this.favorites.posts.remove(postId);
        await Post.decFavoriteCount(postId, this._id);
      } else {
        this.favorites.posts.push(postId);
        await Post.incFavoriteCount(postId, this._id);
      }

      return this.save();
    },

    isPostFavorited(postId) {
      if (this.favorites.posts.indexOf(postId) >= 0) {
        return true;
      }
      return false;
    },
  },
  _shared: {
    async posts(postId) {
      if (this.shared.posts.indexOf(postId) >= 0) {
        this.shared.posts.remove(postId);
        await Share.deleteOne({ post: { _id: postId } });
        await Post.decShareCount(postId, this._id);
      } else {
        const post = await Post.findById(postId);
        const share = new Share();
        share.post = post;
        share.marketer = this._id;
        await share.save();
        this.shared.posts.push(postId);
        await Post.incShareCount(postId, this._id);
      }

      return this.save();
    },

    isPostShared(postId) {
      if (this.shared.posts.indexOf(postId) >= 0) {
        return true;
      }
      return false;
    },
  },
};

export default mongoose.model('User', UserSchema);

