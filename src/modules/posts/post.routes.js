
import { Router } from 'express';
import passport from 'passport';

import validate from 'express-validation';
import multer from 'multer';

import * as postController from './post.controller';
// import { authJwt } from '../../services/auth.services';
// import postValidation from './post.validations';

const routes = new Router();
const authJwt = passport.authenticate('jwt', { session: false });

// For file storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads/');

  },
  filename: function(req, file, cb) {
    cb(null, new Date().toISOString() + file.originalname);
  }
});
const uploads = multer({ storage: storage });

// Create post
routes.post(
  '/',
  authJwt,
  uploads.single('image'),
  postController.createPost,
);

// update cards NOT REQUIRED FOR NARUTO CCG
// routes.patch('/:id', authJwt, postController.updateCard);
// Read post by id
routes.get('/:id', authJwt, postController.getPostById);
// Search all recent posts
routes.get('/', authJwt, postController.getPostsList);
// User adds card to their collection
routes.post('/:id/collect', authJwt, postController.collectCard);
// User removes card from their collection
routes.get('/:id/uncollect', authJwt, postController.uncollectCard);

// User adds card to their collection
routes.post('/:id/want', authJwt, postController.wantCard);
// User removes card from their wantion
routes.get('/:id/unwant', authJwt, postController.unwantCard);

// Banned list
routes.get('/list/view', authJwt, postController.bannedList);

// Erratas
routes.get('/list/erratas', authJwt, postController.erratas);

// Wanted Cards
routes.get('/list/wanted', authJwt, postController.wantedCards);

// Owened Cards
routes.get('/list/owned', authJwt, postController.ownedCards);

// Update card state for sale
routes.get('/:id/sale', authJwt, postController.cardState);
export default routes;

