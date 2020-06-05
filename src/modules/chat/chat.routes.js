import { Router } from 'express';
import passport from 'passport';

import validate from 'express-validation';
import multer from 'multer';

import * as chatController from './chat.controller';
import { auth } from 'firebase-admin';
// import { authJwt } from '../../services/auth.services';


const routes = new Router();
const authJwt = passport.authenticate('jwt', { session: false });

routes.get('/', authJwt, chatController.getChatList);
routes.patch('/:id', authJwt, chatController.updateSocket);
routes.get('/:id', authJwt, chatController.getChat);
routes.post('/:id', authJwt, chatController.message);
routes.post('/', authJwt, chatController.createChat);

export default routes; 

/**
 * Test JWT
 * JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1Yzk4MzMyOTQ4ZDc4YTQ1MmIzZmFiNTgiLCJ1c2VybmFtZSI6IlRlc3RNZSIsInByb2ZpbGVQaWMiOiJ1cGxvYWRzL3Nhc3VrZTEucG5nIiwiaWF0IjoxNTY1NTc1ODA2fQ.ShtMM5k1ZZWKp__pdHxYAhumUO1tjCF2IoyQjFAogMw
 * user_id: 5c98332948d78a452b3fab58
 * chat_id: 5d50c5f4b39d5322ee483f24
 * my JWT
 * JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1YzcwNWQzODQyNThkNzQ0NmE0MGY4MTgiLCJ1c2VybmFtZSI6ImNsYXVkaW8iLCJwcm9maWxlUGljIjoidXBsb2Fkcy9zaGlrYTEucG5nIiwiaWF0IjoxNTY1NTc0MTIyfQ.xav5lPeMM739l_aiOlriUys2ug_xagO-F02SB40Dvzc
 * user_id: 5c705d384258d7446a40f818
 * chat_id: 5d50c5f4b39d5322ee483f22
 */