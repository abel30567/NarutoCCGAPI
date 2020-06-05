import passport from 'passport';
import LocalStrategy from 'passport-local';
import Mixpanel from 'mixpanel';
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';
import FacebookTokenStrategy from 'passport-facebook-token';
import GoogleToken from 'passport-google-token';
import User from '../modules/users/user.model';
import constants from '../config/constants';

const mixpanel = Mixpanel.init(constants.MIXPANEL_KEY);
const GoogleTokenStrategy = GoogleToken.Strategy;
const localOpts = {
  usernameField: 'email', // this is because of the way passport is set up
};

// Local Strategy
const localStrategy = new LocalStrategy(localOpts, async (email, password, done) => {
  try {
    const user = await User.findOne({ email });

    // console.log(email, password);
    // console.log('-------------------');
    // console.log(user);

    // we are seeing if an email has been stored in DB to authorize access
    if (!user) {
      // if there is no user email in DB they can't log in
      return done(null, false);
    } else if (!user.authenticateUser(password)) { // if the typed password is not the user's password, they cant log in
      return done(null, false);
    }
    mixpanel.people.set(user.name, {
      $distinct_id: user.userName,
      $name: user.name,
      $username: user.userName,
      $email: user.email,
      $createdAt: user.createdAt,
      $last_login: new Date(),
    });
    return done(null, user);
  } catch (e) {
    return done(e, false);
  }
});

// JWT Strategy
/**
 * DO NOT CHANGE THIS OR YOUR USERS WILL NOT AUTHENTICATE
 */
const jwtOpts = { 
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
  secretOrKey: constants.JWT_SECRET,
};
// Payload is the data coming from the JWT
const jwtStrategy = new JWTStrategy(jwtOpts, async (payload, done) => {
  // console.log(payload)
  try {
    // We are using ID because we are going to place the user's ID in the payload
    const user = await User.findById(payload._id);

    if (!user) {
      return done(null, false);
    }
    return done(null, user);
  } catch (e) {
    return done(e, false);
  }
});
// Facebook authentications
const FBStrategy = new FacebookTokenStrategy({
  clientID: constants.FACEBOOK_AUTH.clientId,
  clientSecret: constants.FACEBOOK_AUTH.clientSecret,
},
  ((accessToken, refreshToken, profile, done) => {
    User.upsertFbUser(accessToken, refreshToken, profile, (err, user) => done(err, user));
  }));

const GOOGStrategy = new GoogleTokenStrategy({
  clientID: constants.GOOGLE_AUTH.clientId,
  clientSecret: constants.GOOGLE_AUTH.clientSecret,
},
  ((accessToken, refreshToken, profile, done) => {
    User.upsertGoogleUser(accessToken, refreshToken, profile, (err, user) => {
      return done(err, user);
    });
  }));
passport.use(FBStrategy);
passport.use(GOOGStrategy);
passport.use(localStrategy);
passport.use(jwtStrategy);
// passport.use(jwtStripeStrategy);

// Authentication middlewares
export const GoogleAuth = passport.authenticate('google-token', { session: false });
export const FBauth = passport.authenticate('facebook-token', { session: false });
export const authLocal = passport.authenticate('local', { session: false });
export const authJwt = passport.authenticate('jwt', { session: false });
// export const stripeJwt = passport.authenticate('jwt', { session: false });

