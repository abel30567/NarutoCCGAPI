import * as socketController from './socket.controller';
export default io => {
    
    io.on('connection', function(socket){
        socket.on('userJoined', (userId, chatId, messageTo) => socketController.onUserJoined(userId, chatId, messageTo, socket));
        socket.on('message', (message, chatId, messageTo) => socketController.onMessageReceived(message, chatId, messageTo, socket));
        socket.on('read', (userId, chatId, messageTo) => socketController.onRead(userId, chatId, messageTo, socket));
      }); 
};
  