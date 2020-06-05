import HTTPStatus from 'http-status';
import nodemailer from 'nodemailer';
import rp from 'request-promise';

import Mixpanel from 'mixpanel';
import Post from '../posts/post.model';
import Market from './market.model';
import User from '../users/user.model';
import Search from '../logs/search.model';
import constants from '../../config/constants';

import admin from 'firebase-admin';


const mixpanel = Mixpanel.init(constants.MIXPANEL_KEY);
let mailchimpInstance = constants.MAILCHIMP_INSTANCE;
let listUniqueId = constants.MAILCHIMP_LIST;
let mailchimpApiKey = constants.MAILCHIMP_KEY;
// Migrate to model
/* 
 * GET /api/v1/market/
 *
 * Migrate from card object to Market object
*/
export async function migrateModel(req, res) {
    try {
      const promise = await Promise.all([
        Post.find({ "wanted.0": { $exists: true} }).populate({path: 'wanted.user', populate: { path: 'user', model: 'User'}}),
        Post.find({ "owned.0" : { $exists: true } }).populate({path: 'owned.user', populate: { path: 'user', model: 'User'}})
      ]);
      const wanted = promise[0];
      // Clear DB
      await Market.deleteMany({});
      let wantSum = 0;
      let wantArr = [];
      wanted.forEach(card => { 
        card.wanted.forEach(want => {
          wantSum += 1;
          // console.log("wanted sum: ", wantSum);
          let marker = {
            card: card,
            value: want.value,
            amount: want.amount,
            user: want.user,
            type: 'Wanted',
          };
          wantArr.push(marker);
        })
      });

      console.log("total wants: ", wantArr.length)
      wantArr.forEach(async marker => {
        try {
          /**
           *  DELETE MARKET ON DB
           * GET THE RIGHT DATA
           * 
           */
          const market = new Market();
          market.card = marker.card;
          market.type = marker.type;
          market.amount = marker.amount;
          market.value = marker.value;
          market.user = marker.user;
          await market.save() 
        } catch (e) {
          console.log('error')
        }
      });
      // Owned
      const owned = promise[1];
      let ownSum = 0;
      let ownArr = [];
      owned.forEach(card => {
        card.owned.forEach(own => {
          ownSum += 1;
          // console.log("owned sum: ", ownSum);
          let marker = {
            card: card,
            value: own.value,
            amount: own.amount,
            user: own.user,
            type: 'Owned',
          };
          ownArr.push(marker);
        })
      });

      console.log("total owned: ", ownArr.length)
      ownArr.forEach(async marker => {
        try {
          /**
           *  DELETE MARKET ON DB
           * GET THE RIGHT DATA
           * 
           */
          const market = new Market();
          market.card = marker.card;
          market.type = marker.type;
          market.amount = marker.amount;
          market.value = marker.value;
          market.user = marker.user;
          await market.save() 
        } catch (e) {
          console.log('error')
        }
      });
      let tot = ownArr.length + wantArr.length;

      return res.status(HTTPStatus.OK).json({
        total: tot,
        wantLen: wantArr.length,
        ownLen: ownArr.length,
        wanted: wantArr,
        owned: ownArr
      });
    } catch (e) {
      return res.status(HTTPStatus.BAD_REQUEST).json(e);
    }
  }

export async function mailingList(req, res) {
  try {
    let k = 0;
    let users = await User.find();
    loop(k, users);
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}
  
function loop(k, users) {
    setTimeout(async () => {
        console.log(k)
        let end = await addToMailingList(k, users);
        k++;
        if (k <= end) { // 234468 234502
            loop(k, users);
        }
    }, 2000)
}
async function addToMailingList(i, users) {

    let subscriber = JSON.stringify({
        'email_address': users[i].email,
        'status': 'subscribed',
        'merge_fields': {
          'WNAME': users[i].name,
          'UNAME': users[i].userName,
          'LOCATION': users[i].location
        }
      });
      let MCoptions = {
        method: "POST",
        body: subscriber,
        headers: {
          Authorization : `apikey ${mailchimpApiKey}`, 
          "Content-Type": "application/json"
        }
      }
      rp('https://' + mailchimpInstance + '.api.mailchimp.com/3.0/lists/' + listUniqueId + '/members', MCoptions)
        .then(resp => {
          console.log(users[i].userName);    
        })
        .catch(err => {
          console.log(err);
        })
      
      return users.length;
}

export async function announcements(req, res) {
  try {
    return res.status(HTTPStatus.CREATED).json({
      title: "A Shinobi's Dream & New Profile Pics",
      message: "Once you update your app you can see a new search filter for Set 29, A Shinobi's Dream. Can you make your deck stronger with the new set 29? A huge thanks to Mardo, dHTp and Haplo7680 for making these cards possible!                                                                                                                        Now you can choose new profile images! Choose between the Fourth Hokage, Boruto, or even Naruto Sage Mode. Check the settings tab on your profile to change it.",
      image: "https://pbs.twimg.com/media/EIkhGekWkAIokq0?format=jpg&name=large"
    });
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e); 
  }
}

export async function notifications(req, res) {
  try {
    const registrationToken = await User.findById("5c705d384258d7446a40f818");
    const message = {
      notification:{
        title:"Initialize from root",
        body:"test",
        // type: "User",
        // route: "Object"
        // priority:"high" this was in tutorial but don"t know why
      },
        // priority: 1,
        data: {
          title:"Initialize from root",
          body:"test from data object",
          type: "User",
          route: "Object"
        },
        // token: registrationToken.fcmToken
        // Android test
        token: "d0qfgv8_LlE:APA91bHFhX6ADogqrBsgUr8PZhcLWMkQ0U1XPrg9X2qyClN_cBg0-zhgnb01bwCnd314hvIIsB5rJFYO6hhWFTQD0qKXStWCq8ffMk6n6dtFcKpsG8lauSsaAO9vguObcggMRyAdhSKH"
    }
    const response = await admin.messaging().send(message)
    return res.status(HTTPStatus.CREATED).json({response});
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e); 
  }
}
export async function deleteCollection(req, res) {

  try {
    const deleteUser = await User.findById(req.body.id);
    console.log(deleteUser);
    // await Post.updateOne({ _id: req.params.id}, { $pull: { owned: { user: req.user._id } } })
    let posts = await Post.updateMany({}, {$pull: { owned: { user: deleteUser._id } }}); //({$pull: { owned: { user: deleteUser._id } }});
    console.log("deleting collection");
    console.log(posts);
    await posts.save();
    return res.status(HTTPStatus.OK);
    // let collection = await Post.find({ 'owned.user' : req.body.id});
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e); 
  }
}