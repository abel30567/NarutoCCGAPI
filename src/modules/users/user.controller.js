import HTTPStatus from 'http-status';
import Mixpanel from 'mixpanel';

import Post from '../posts/post.model';
import Communication from '../logs/communication.model';
import nodemailer from 'nodemailer';
import request from 'request';
import rp from 'request-promise';
import User from './user.model';
import constants from '../../config/constants';
// Push notifications
import admin from 'firebase-admin';


// Mailchimp register
let mailchimpInstance = constants.MAILCHIMP_INSTANCE;
let listUniqueId = constants.MAILCHIMP_LIST;
let mailchimpApiKey = constants.MAILCHIMP_KEY;

/* HELPER FUNCTIONS
 *
 * Functions that help the controller's functions
*/
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: constants.SES_EMAIL,
    pass: constants.SES_PASS,
  },
});

const mixpanel = Mixpanel.init(constants.MIXPANEL_KEY);

export function FBlogin(req, res, next) {
  res.status(HTTPStatus.OK).json(req.user.toAuthJSON());
  // passport puts the user as a request, then we create a JWT token to send to the front

  return next();
}
/* NOT TESTED
 * POST /api/v1/users/signup
 *
 * Sign up as a user
 * USE THIS FOR NARUTO CCG
 * 
 * Randomly choose image from the ones below
 * 
 * "uploads/2019-04-05T02:05:03.915ZnarutoPic.png" 
 * "uploads/Hokage1.png"
 * "uploads/sasuke1.png"
 * "uploads/shika1.png"
 * "uploads/2019-04-05T02:09:34.373ZhinataPic.png"
 * "uploads/2019-04-05T02:09:50.767ZinoPic.png"
 * "uploads/2019-04-05T02:10:27.568ZkakashiPic.png"
 * "uploads/2019-04-05T02:11:12.250ZkarinPic.png"
 * "uploads/2019-04-05T02:11:35.581ZorochiPic.png"
 * "uploads/2019-04-05T02:12:04.481ZpainPic.png"
 * "uploads/2019-04-05T02:12:41.738ZsakuraPic.png"
 * "uploads/2019-04-05T02:13:01.592ZtobiPic.png"
 * 
 * Need banlist.....How do I do the call?
 * 
 * Or I hardcode image source on front... 
 * I dont expect too much change there. I use postman to find image link
 * Yeah this way wins
 * 
 * start up Metamesh for data
 * 
 
*/
export async function signUp(req, res) {
  try {
    const user = await User.create(req.body);

    const imageArr = [
      "uploads/2019-04-05T02:05:03.915ZnarutoPic.png", 
      "uploads/Hokage1.png", 
      "uploads/sasuke1.png",
      "uploads/shika1.png",
      "uploads/2019-04-05T02:09:34.373ZhinataPic.png",
      "uploads/2019-04-05T02:09:50.767ZinoPic.png",
      "uploads/2019-04-05T02:10:27.568ZkakashiPic.png",
      "uploads/2019-04-05T02:11:12.250ZkarinPic.png",
      "uploads/2019-04-05T02:11:35.581ZorochiPic.png",
      "uploads/2019-04-05T02:12:04.481ZpainPic.png",
      "uploads/2019-04-05T02:12:41.738ZsakuraPic.png",
      "uploads/2019-04-05T02:13:01.592ZtobiPic.png"
    ];
    const index = getRandomInt(imageArr.length);

    user.image = imageArr[index];
    mixpanel.track('New User', {
      distinct_id: user.userName,
    });
    mixpanel.people.set(user.name, {
      $distinct_id: user.userName,
      $name: user.name,
      $username: user.userName,
      $email: user.email,
      $createdAt: user.createdAt,
      $last_login: new Date(),
    });
    await user.save();
    let subscriber = JSON.stringify({
      'email_address': user.email,
      'status': 'subscribed',
      'merge_fields': {
        'WNAME': user.name,
        'UNAME': user.userName,
        'LOCATION': user.location
      }
    });
    // let MCoptions = {
    //   body: subscriber,
    //   headers: {
    //     Authorization : `apikey ${mailchimpApiKey}`, 
    //     "Content-Type": "application/json"
    //   }
    // }
    // request
    //     .post('https://' + mailchimpInstance + '.api.mailchimp.com/3.0/lists/' + listUniqueId + '/members', MCoptions, (err, response, body) => {
    //     if (response.status < 300 || (response.status === 400 && response.body.title === "Member Exists")) {
    //       return res.status(HTTPStatus.BAD_REQUEST).json(e);
    //       } else {
    //         return res.status(HTTPStatus.CREATED).json(user.toAuthJSON());
    //       }
    //     });
    
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
        return res.status(HTTPStatus.CREATED).json(user.toAuthJSON());    
      })
      .catch(err => {
        return res.status(HTTPStatus.BAD_REQUEST).json(err);
      })
      
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

/* TESTED
 * POST /api/v1/users/login
 *
 * login as a user
 * USE THIS FOR NARUTO CCG
*/
export function login(req, res, next) {
  res.status(HTTPStatus.OK).json(req.user.toAuthJSON());
  // passport puts the user as a request, then we create a JWT token to send to the front

  return next();
}

/* TESTED
 * GET /api/v1/users/:id
 *
 * User id is needed
 * View user's profile
 * 
*/
export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.params.id);
    let collection = await Post.find({ 'owned.user' : req.params.id});
    let wantList = await Post.find({ 'wanted.user' : req.params.id});
    // if the one asking isn't self
    if (String(req.user._id) !== String(user._id)) {
      mixpanel.track('View a Profile', {
        distinct_id: req.user.userName,
        viewed: user.userName
      })
    }
    return res.status(HTTPStatus.CREATED).json({
      profile: user.toJSON(),
      collection,
      wantList
    });
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

/* TESTED
 * POST /api/v1/users/message/:id
 *
 * Send an email to user with id
 * body: {
 *  message: String,
 *  card: ObjectId
 * }
 * ADD MORE USER PICS DESIGNER.IO
 * 
 * 
 * 
*/
export async function messageUser(req, res) {
  try {
    mixpanel.track('User Messages', {
      distinct_id: req.user._id,
    });
    const logMessage = await new Communication();
    logMessage.from = req.user._id;
    logMessage.to = req.params.id;
    logMessage.message = req.body.message;
    await logMessage.save();
    const messageTo = await User.findById(req.params.id);
    const card = await Post.findById(req.body.card);
    const messageFrom =  await User.findById(req.user._id);
    let cardURL = card.image.replace(" ", "%20");
    let text = `<h3>Hey ${messageTo.userName}</h3> <br/> <h4>${messageFrom.userName} contacted you for ${card.name}:</h4> `;
    text += `<img width="350" height="490" alt="Card" title="Card" style="display:block" src="https://development.metamesh.io/${cardURL}" />`
    text += `<br /> <h3>${req.body.message}</h3>`;
    text += `<br/><br/><p>To reach out back to ${messageFrom.userName} you can email them at ${messageFrom.email} or see if their username can be found in our Discord chat</p>`;
    text += "<br/><p>If you aren't in our Discord chat be sure to join!</p> <br/>";
    text += "<a href='https://discord.gg/57XYCw7'>Join Naruto CCG Discord Chat</a>";
    text += "<br/><br/><br/> <p>Keep enjoying the Naruto CCG App</p><br/>";
    text += "<p>Have a suggestion for our community app? <a href='mailto:thenarutoccg@gmail.com?subject=App Suggestion'>Let us know your suggestion</a></p>";
    const mailOptions = {
      sender: constants.SES_EMAIL, // sender address
      replyTo: messageFrom.email,
      to: messageTo.email, // list of receiver
      subject: `New message for ${card.name}`, // Subject line
      html: text,
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.log('Error : ' + error);
      } else {
        // Push notification
        if (messageTo.fcmToken) {
          const message = {
            notification:{
              title:`Message from ${messageFrom.userName}`,
              body:`Check your email! ${messageFrom.userName}: ${req.body.message}`,
            },
            data:{
              title:`Message from ${messageFrom.userName}`,
              body:`Check your email! ${messageFrom.userName}: ${req.body.message}`,
              type: 'User',
              route: String(messageFrom._id)
            },
              // priority: 1,
              token: messageTo.fcmToken
          }
          const push = await admin.messaging().send(message) 
        }
        return res.status(HTTPStatus.OK).json(card);
      }
    }); 
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e); 
  }
}

/*  TESTED
 * PATCH /api/v1/users/picture
 *
 * Updates a user's profile pic
 * body: {
 *  image: String
 * }
*/
export async function updateUserProfile(req, res) {
  try {
    const user = await User.findById(req.user._id);
    user.image = req.body.image;

    return res.status(HTTPStatus.OK).json(await user.save());
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

/*  TESTED
 * POST /api/v1/users/profilepic
 *
 * Add profile images after edits (Admin endpoint)
*/
export async function updateUserProfilePic(req, res) {
  try {
    const user = await User.findById(req.user._id);
    // console.log(req.file.path);
    user.image = req.file.path;
    // await user.save()

    return res.status(HTTPStatus.OK).json(await user.save());
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

/**
 * NOT TESTED
 * 
 * GET /api/v1/users/list/top
 * 
 *  lists the top users based on having a collection/want list
 */
export async function topUsers(req, res) {
  try {
    const ownedCards = await Post.find({ "owned.0" : { $exists: true } }).populate({path: 'owned.user', populate: { path: 'user', model: 'User'}});
    const wantedCards = await Post.find({ "wanted.0": { $exists: true} }).populate({path: 'wanted.user', populate: { path: 'user', model: 'User'}});

    let userArr = [];

    ownedCards.forEach(card => {
      card.owned.forEach(owned => {
        let found = userArr.some(userObject => String(userObject.user) === String(owned.user._id));
        if (!found) {
          userArr.push({
            user : owned.user._id,
            userName: owned.user.userName,
            picture: owned.user.image,
            count : 0,
            createdAt: owned.user.updatedAt
          });
        } else {
          userArr.forEach(userObject => { 
            if (String(userObject.user) === String(owned.user._id)) {
              userObject.count += 1;
            }
          })
        }
      });
    });

    wantedCards.forEach(card => {
      card.wanted.forEach(wanted => {
        let found = userArr.some(userObject => String(userObject.user) === String(wanted.user._id));
        if (!found) {
          userArr.push({
            user : wanted.user._id,
            userName: wanted.user.userName,
            picture: wanted.user.image,
            count : 0,
            createdAt: wanted.user.updatedAt
          });
        } else {
          userArr.forEach(userObject => { 
            if (String(userObject.user) === String(wanted.user._id)) {
              userObject.count += 1;
            }
          })
        }

      });
    });
    userArr.sort((a,b) => {
      return b.createdAt - a.createdAt;
  });
    return res.status(HTTPStatus.OK).json({
      users: userArr,
    });
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
    
  }
}

export async function registerFCM(req,res) {
  try {
    const user = await User.findById(req.user._id);
    user.fcmToken = req.body.token;
    user.lastActive = new Date();
     console.log("RAN USER UPDATE");
    return res.status(HTTPStatus.OK).json(await user.save());
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}