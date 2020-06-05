import Joi from 'joi';

export default {
  createPost: {
    body: {
      title: Joi.string().min(3).required(),
      text: Joi.string().min(5).required(),
    },
  },
  updatePost: {
    body: {
      title: Joi.string().min(3),
      text: Joi.string().min(20), // no required because user might want to fix one and not the other.
    },
  },
};

