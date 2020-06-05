/* eslint-disable no-console */
import express from 'express';
import HTTP from 'http';
import socketio from 'socket.io';
// import proxy from 'express-http-proxy';
import constants from './config/constants';

import './config/database';

import middlewaresConfig from './config/middleware';

import apiRoutes from './modules';
import chatSocket from './socket';
// Set up firebase for notifications
import admin from 'firebase-admin';

const serviceAccount = require('./config/narutoccg-38522-firebase-adminsdk-dq5z7-eb9b67b2df.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: constants.FIREBASE_DB
});

const app = express();
const app2 = express();
const http= HTTP.createServer(app);
const http2 = HTTP.createServer(app2);
middlewaresConfig(app);

app.use('/uploads', express.static('uploads'));
// app.use('/chat', proxy('http://localhost:8080'));

app.get('/', (req, res) => {
  res.send('Ninjas Assemble');
});

app2.get('/test', (req,res) => {
  res.send('on Chat server');
})
// Setting up the API
apiRoutes(app);

// Setting up sockets
const io = socketio(http2);
const io2 = socketio.listen(http);

chatSocket(io);
chatSocket(io2);



http2.listen(8080, function(){
  console.log('listening on *:8080'); 
});
// Port set up
const PORT = constants.PORT;
http.listen(PORT, err => { 
  if (err) {
    throw err;
  } else {
    console.log(`Server running on port: ${PORT}
        ---------------
        ${__dirname}
        Running on ${process.env.NODE_ENV}
        -------------- 
        Code with the Will of Fire!!
        `);
  }
});
