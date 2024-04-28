import "dotenv/config"; 
import chalk from "chalk";
import express from "express";
import morgan from "morgan";
import passport from "passport";
import auth from "./routes/authentication.js";
import apiRoute from "./routes/apiRoute.js"
import session from "express-session";
import GoogleStrategy from "passport-google-oauth20";
import cors from "cors";
import userdb from "./model/userSchema.js";
import connectionToDB from "./db/connection.js";

await connectionToDB(); 

const app = express();
app.use(cors());

if(process.env.NODE_ENV === 'development'){
    app.use(morgan("dev")); 
}

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Origin', '*');
    next();
 });


// Middleware 
app.use(express.json()); 

// URL Encoded payloads 
app.use(express.urlencoded({extended: false}));

// setup session 
/**
 * This session is used to encrypt the user data 
 * Similar to jwt token services
 **/
app.use(session({
    secret: process.env.SECRET_SESSION,
    resave: false,
    saveUninitialized: true
}))


// setup passport 
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done)=>{
    done(null, user.id);
})

passport.deserializeUser((id, done)=>{
    userdb.findById(id).then(user => {
        done(null, user)
    })
})

passport.use(
        new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL, 
        scope: ["profile", "email"]
    }, 
    async (accessToken, refreshToken, profile, done) => {
        const existingUser = await userdb.findOneAndUpdate({googleId: profile.id},{
            accessToken, 
            refreshToken, 
            googleId: profile.id, 
            userName: profile.displayName, 
            email: profile.emails[0].value,
            isVerified: profile.emails[0].verified,
            openAIKey: profile.openAIKey, 
            buttonCounts: profile.buttonCounts
        })

        if(existingUser){
            return done(null, existingUser); 
        }

        const newUser = await new userdb({
            accessToken, 
            refreshToken, 
            googleId: profile.id, 
            userName: profile.displayName, 
            email: profile.emails[0].value,
            isVerified: profile.emails[0].verified,
            openAIKey: profile.openAIKey, 
            buttonCounts: profile.buttonCounts
            }).save(); 
        
        done(null, newUser);
    }
));

app.use("/auth", auth);
app.use("/api", apiRoute);


// Testing routes 
app.get("/test", (req, res) => {
    res.json({Hi: "This is a testing message"}); 
})

const PORT = process.env.PORT || 1997; 

app.listen(PORT , ()=> {
    console.log(
        `${chalk.green.bold("✅")} 👍Server running in ${chalk.yellow.bold(process.env.NODE_ENV)} mode on port ${chalk.blue.bold(PORT)}`
    );
})



