import HTTPStatus from 'http-status';
import Mixpanel from 'mixpanel';

import Post from '../posts/post.model';
import User from '../users/user.model';
import { model } from 'mongoose';

/* HELPER FUNCTIONS
 *
 * Functions that help the controller's functions
*/
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
const mixpanel = Mixpanel.init('6355b9138ef99a42321be6306756111e');


/* TESTED
 * GET /api/v1/guest/post?query
 *
 * Search all posts as guest
*/
export async function getPostsListAsGuest(req, res) {
  try {
    let noMatch = null;
    if (req.query.search) {
     
      const regex = new RegExp(escapeRegex(req.query.search), 'gi');
      const promise = await Promise.all([
        Post.find({ name: regex }).sort({ createdAt: -1 }),
      ]);
      const posts = promise[0];
      if (posts.length < 1) {
        noMatch = 'No posts match that search, please try again.';
      }
      return res.status(HTTPStatus.OK).json({
        posts,
        result: noMatch,
      });
    } else if (!req.query.search) {
      const limit = parseInt(req.query.limit, 0);
      const skip = parseInt(req.query.skip, 0);
      const promise = await Promise.all([
        Post.list({ skip, limit }),
      ]);

      const posts = promise[0];
      return res.status(HTTPStatus.OK).json({
        posts,
        result: noMatch,
      });
    }
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

/* TESTED
 * GET /api/v1/guest/post?query
 *
 * Search all posts as guest
*/
export async function getRising(req, res) {
  try {
    let noMatch = null;
    if (req.query.search) {
     
      const regex = new RegExp(escapeRegex(req.query.search), 'gi');
      const promise = await Promise.all([
        Post.find({ name: regex }).sort({ dayChange: -1 }),
      ]);
      const posts = promise[0];
      if (posts.length < 1) {
        noMatch = 'No posts match that search, please try again.';
      }
      return res.status(HTTPStatus.OK).json({
        posts,
        result: noMatch,
      });
    } else if (!req.query.search) {
      const limit = parseInt(req.query.limit, 0);
      const skip = parseInt(req.query.skip, 0);
      const promise = await Promise.all([
        Post.find().sort({ dayChange: -1 }),
      ]);

      const posts = promise[0];
      return res.status(HTTPStatus.OK).json({
        posts,
        result: noMatch,
      });
    }
  } catch (e) {
    return res.status(HTTPStatus.BAD_REQUEST).json(e);
  }
}

/* TESTED
 * GET /api/v1/guest/post/:id
 *
 * Get a post with a certain id
*/
export async function getPostById(req, res) {
  Post.findById(req.params.id)
    .then(post => {

      return res.status(HTTPStatus.OK).json(
        post.toJSON(),
      );
    })
    .catch(err => {
      console.log(err);
    });
}

