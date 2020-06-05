
import Joi from 'joi';

export const passwordReg = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;

export default {
  signup: {
    body: {
      email: Joi.string().email().required(),
      password: Joi.string().regex(passwordReg).required(),
      location: Joi.string().required(),
      userName: Joi.string().required(),
    },
  },
};
