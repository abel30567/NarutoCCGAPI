import { Router } from 'express';

import * as guestController from './guest.controller';

const routes = new Router();
// Get all posts as guest
routes.get('/post', guestController.getPostsListAsGuest);
routes.get('/post/:id', guestController.getPostById);
routes.get('/rising', guestController.getRising);


export default routes;
