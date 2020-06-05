import HTTPStatus from 'http-status';
import Mixpanel from 'mixpanel';

import Post from '../posts/post.model';
import Communication from '../logs/communication.model';
import nodemailer from 'nodemailer';
import request from 'request';
import rp from 'request-promise';
import User from '../users/user.model';
import Chat from './chat.model';
import constants from '../../config/constants';
// Push notifications
import admin from 'firebase-admin';

/**
 * 
 * GET /api/v1.1/chat/
 * 
 * Get a list of chats that the user is the "From" address
 * 
 */
export async function getChatList(req,res) {
    try {
        let chats = await Chat.find({chatFrom: req.user._id}).sort({ updatedAt: -1 }).populate('chatTo');
        // console.log(chats);
        // Sort to get latest message
        chats.forEach(chat => {
            chat.conversation.sort((a,b) => {
                return b.createdOn.getTime()  - a.createdOn.getTime()
            })
        });
        return res.status(HTTPStatus.OK).json(chats);
    } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e); 
    }
}
/**
 * 
 * GET /api/v1.1/chat/:id
 * 
 * Get a certain chat
 * 
 */
function compareIndexFound(a, b) {
    if (a.createdOn.getTime() < b.createdOn.getTime()) { return -1; }
    if (a.createdOn.getTime() > b.createdOn.getTime()) { return 1; }
    return 0;
  }
export async function getChat(req,res) {
    try {
        // Get From chat
        let chat = await Chat.findById(req.params.id).populate('chatTo').populate('chatFrom').populate('conversation.user');
        chat.conversation.sort((a,b) => {
            return b.createdOn - a.createdOn;
        });
        
        // To Chat
        // WORRY ABOUT THE READS LATER
        // let toChat = await Chat.find({ chatFrom: chat.chatTo, chatTo: req.user._id });
        // chat.conversation.forEach((msg) => {
        //     if (msg.read == false) {
        //         msg.read = true;
        //     }
        // });
        return res.status(HTTPStatus.OK).json(chat);
    } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e); 
    }
}
/**
 * POST /api/v1.1/chat/
 * 
 * Only create chats when users initially message each other.
 * This request will be from actual chat screen.
 * 
 * Add notifications.
 * 
 * body:{
 *  message: String
 *  messageTo: ObjectId
 * }
 */
export async function createChat(req, res) {
    try {
        // Picture you are the "messageFrom" user
        console.log("REQUEST",req.body);
        const messageFrom = req.user._id;
        const message = req.body.message;
        const cardImage = req.body.image;
        const messageTo = await User.findById(req.body.messageTo);
        const fromChat = new Chat();
        fromChat.chatFrom = messageFrom;
        fromChat.chatTo = messageTo;
        let messageObject = {};
        messageObject.user = messageFrom;
        messageObject.message = message;
        messageObject.read = false;
        messageObject.createdOn = new Date();
        if (cardImage !== '' && cardImage !== null && cardImage !== undefined) {
            let _attachment= {};
            _attachment.object_id = cardImage;
            _attachment.object_type = message.attachmentType;
            messageObject.attachment = _attachment;
          }
        fromChat.conversation.push(messageObject);
        
        // Picture you being messaged
        const toChat = new Chat();
        toChat.chatFrom = messageTo;
        toChat.chatTo = messageFrom;
        // Message Object is the same because we are comparing
        // the user ids to identify. Message in both chats is 
        // the same.
        toChat.conversation.push(messageObject);
        await toChat.save();
        await fromChat.save()
        if (messageTo.fcmToken) {
            const message = {
              notification:{
                title:`New Message from ${req.user.userName}`,
                body:req.body.message,
              },
              data:{
                title:`New Message from ${req.user.userName}`,
                body:req.body.message,
                type: 'Chat',
                route: String(toChat._id)
              },
                // priority: 1,
                token: messageTo.fcmToken
            }
            const push = await admin.messaging().send(message) 
          }
        return res.status(HTTPStatus.CREATED).json(fromChat);
    } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e); 
    }
}
/**
 * 
 * POST /api/v1.1/chat/:id
 * 
 * Get a certain chat
 * 
 */
export async function message(req, res) {
    try {
        
        let messageTo = await User.findById(req.body.messageTo); 
        let chat = await Chat.findById(req.params.id).populate('conversation.user');
        let otherChat = await Chat.find({chatFrom: messageTo, chatTo: req.user._id});
        let chatTo = otherChat[0];
        let messageObject = {};
        messageObject.user = req.user._id;
        messageObject.message = req.body.message;
        messageObject.read = false;
        messageObject.createdOn = new Date();
        // console.log(messageObject);
        await chat.conversation.push(messageObject);
        await chatTo.conversation.push(messageObject);
        await chatTo.save();
        if (messageTo.fcmToken) {
            console.log("inside notification creation")
            const message = {
              notification:{
                title:req.user.userName,
                body:req.body.message,
              },
              data:{
                title:req.user.userName,
                body:req.body.message,
                type: 'Chat',
                route: String(req.params.id)
              },
                // priority: 1,
                token: messageTo.fcmToken
            }
            
            admin.messaging().send(message)
            .then(async push => {
                console.log('ran notification');
                return res.status(HTTPStatus.CREATED).json(await chat.save());
            })
            .catch(async err => {
                console.log(err);
                return res.status(HTTPStatus.CREATED).json(await chat.save());
            })
          }
        
    } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e); 
    }
}

/**
 * 
 * PATCH /api/v1.1/chat/:id
 * 
 * Update socket 
 * 
 * fromSocket: socketID
 * messageTo: userID
 * 
 */
export async function updateSocket(req,res) {
    try {
        // Get From chat
        let chat = await Chat.findById(req.params.id).populate('chatTo').populate('chatFrom').populate('conversation.user');
        chat.fromSocket = req.body.fromSocket;
        let messageTo = req.body.messageTo;
        let otherChat = await Chat.find({chatFrom: messageTo, chatTo: req.user._id});
        let chatTo = otherChat[0];
        chatTo.toSocket = req.body.fromSocket;
        await chat.save();
        await chatTo.save();
        return res.status(HTTPStatus.OK).json(chat);
    } catch (e) {
        return res.status(HTTPStatus.BAD_REQUEST).json(e); 
    }
}