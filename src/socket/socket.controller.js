import admin from 'firebase-admin';
import Chat from '../modules/chat/chat.model';
import User from '../modules/users/user.model';

export async function onUserJoined(userID, chatID, messageTo, socket) {
    try {
        let chat = await Chat.findById(chatID);
        let otherChat = await Chat.find({chatFrom: messageTo, chatTo: userID});
        let chatTo = otherChat[0];
        // console.log(String(chat._id) < String(chatTo._id))
        chat.conversation.forEach(messg => {
          messg.read = true;
        });
        chat.save();
        let chatHash;
        if (String(chat._id) < String(chatTo._id)) {
          chatHash = hashcode(String(chat._id) + String(chatTo._id));
        } else {
          chatHash = hashcode(String(chatTo._id) + String(chat._id))
        }
         
        // console.log("CHAT ID: ", chat._id);
        // console.log("Other CHAT ID: ", chatTo._id);
        // console.log("MESSAGE TO USER IS:",chat.chatTo);
        // console.log("MESSAGE FROM USER IS:",chat.chatFrom);
        socket.join(String(chatHash), () => {
            console.log('joined room', chatHash);
            return true;
        })
    } catch (e) {
        return false;
    }
}

function hashcode(s) {
    var h = 0, l = s.length, i = 0;
    if ( l > 0 )
      while (i < l)
        h = (h << 5) - h + s.charCodeAt(i++) | 0;
    return h;
  };
export async function onMessageReceived(message, chatID, _messageTo, socket) {
    try {
        console.log("MESSAGE IS:",message);
        let messageTo = await User.findById(_messageTo); 
        console.log("MESSAGE TO USER IS:",messageTo);
        let messageFrom = await User.findById(message.user); 
        console.log("MESSAGE FROM USER IS:",messageFrom);
        let chat = await Chat.findById(chatID).populate('conversation.user');
        console.log("CHAT FROM before IS:",chat);
        let otherChat = await Chat.find({chatFrom: messageTo, chatTo: message.user});
        console.log("CHAT To before IS:",otherChat[0]);
        let chatTo = otherChat[0];
        let chatHash;
        if (String(chat._id) < String(chatTo._id)) {
            chatHash = hashcode(String(chat._id) + String(chatTo._id));
          } else {
            chatHash = hashcode(String(chatTo._id) + String(chat._id))
          }
        let messageObject = {};
        messageObject.user = messageFrom;
        messageObject.message = message.text;
        messageObject.read = false;
        messageObject.createdOn = new Date(message.createdAt);
        if (message.image) {
          let _attachment= {};
          _attachment.object_id = message.image;
          _attachment.object_type = message.attachmentType;
          messageObject.attachment = _attachment;
        }
        console.log(messageObject);
        await chat.conversation.push(messageObject);
        await chatTo.conversation.push(messageObject);
        await chatTo.save();
        await chat.save();
        /**
         * TO DO:
         * Figure out sorting logic if sending entire chat to frontend.
         * Figure out how to only pass that one message and append to chat view
         */
        if (messageTo.fcmToken) {
            console.log('Inside notification')
            console.log(messageTo.fcmToken);
            const notificationMessage = {
              notification:{
                title: messageFrom.userName,
                body: message.text,
              },
              data:{
                title: messageFrom.userName,
                body: message.text,
                type: 'Chat',
                route: String(chatTo._id)
              },
                // priority: 1,
                token: messageTo.fcmToken
            }
            chat.conversation.sort((a,b) => {
                let aDate = new Date(a.createdOn);
                let bDate = new Date(b.createdOn);
                let aNum =  aDate.getTime();
                let bNum = bDate.getTime();
                return Number(bNum) - Number(aNum);
            });
            // Message sent
            socket.to(String(chatHash)).emit('message', chat);
            // Show notification
            admin.messaging().send(notificationMessage)
            .then(push => {
                console.log('ran notification');
            })
            .catch(err => {
                console.log(err);
            })
            
          }
        // console.log("CHAT To after IS:",otherChat);
          
          
        
    } catch (e) {
        
    }
}
export async function onRead(userID, chatID, messageTo, socket) {
  try {
      let chat = await Chat.findById(chatID);
      let otherChat = await Chat.find({chatFrom: messageTo, chatTo: userID});
      let chatTo = otherChat[0];
      // console.log(String(chat._id) < String(chatTo._id))
      chat.conversation.forEach(messg => {
        messg.read = true;
      });
      chat.save();
       
      return true;
  } catch (e) {
      return false;
  }
}