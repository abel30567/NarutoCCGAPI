
import { Router } from 'express';
import passport from 'passport';

import validate from 'express-validation';
import multer from 'multer';

import * as marketController from './market.controller';
// import { authJwt } from '../../services/auth.services';
// import postValidation from './post.validations';

const routes = new Router();
const authJwt = passport.authenticate('jwt', { session: false });

routes.get('/', marketController.migrateModel);
routes.get('/email', marketController.mailingList);
routes.get('/announcements', marketController.announcements);
routes.get('/notification', marketController.notifications);
routes.post('/deletecollection', marketController.deleteCollection);
export default routes;
