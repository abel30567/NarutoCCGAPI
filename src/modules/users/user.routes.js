import { Router } from 'express';
import validate from 'express-validation';
import multer from 'multer';

import * as userController from './user.controller';
import userValidation from './user.validation';
import { authLocal, authJwt, GoogleAuth, FBauth } from '../../services/auth.services';

const routes = new Router();

// For file storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, './uploads/');
  },
  filename(req, file, cb) {
    cb(null, new Date().toISOString() + file.originalname);
  },
});
const uploads = multer({ storage });

// Sign up as a user
routes.post('/signup', validate(userValidation.signup), userController.signUp);

// Login as a user
routes.post('/login', authLocal, userController.login);

// User profile
routes.get('/:id', authJwt, userController.getProfile);

// message user
routes.post('/message/:id', authJwt, userController.messageUser);

// change picture
routes.patch('/picture', authJwt, userController.updateUserProfile);

// Add user images (Admin endpoint)
routes.post('/profilepic', authJwt, uploads.single('image'), userController.updateUserProfilePic);

routes.get('/list/top', authJwt, userController.topUsers);

routes.patch('/registerpush', authJwt, userController.registerFCM);
export default routes;

