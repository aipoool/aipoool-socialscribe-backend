import passport from "passport";
import OAuth2Strategy from "passport-google-oauth20";
import userdb from "./model/userSchema.js";

passport.use(
    new OAuth2Strategy.Strategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        const existingUser = await userdb.findOneAndUpdate(
          { googleId: profile.id },
          {
            accessToken,
            refreshToken,
            googleId: profile.id,
            userName: profile.displayName,
            email: profile.emails[0].value,
          }
        );
  
        if (existingUser) {
          return done(null, existingUser);
        }
  
        const newUser = await new userdb({
          accessToken,
          refreshToken,
          googleId: profile.id,
          userName: profile.displayName,
          email: profile.emails[0].value,
        }).save();
  
        done(null, newUser);
      }
    )
  );
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser((id, done) => {
    userdb.findById(id).then((user) => {
      done(null, user);
    });
  });


export default passport;