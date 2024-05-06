import "dotenv/config"; 
import chalk from "chalk";
import express from "express";
import morgan from "morgan";
import passport from "passport";
import auth from "./routes/authentication.js";
import apiRoute from "./routes/apiRoute.js"
import session from "express-session";
import OAuth2Strategy from "passport-google-oauth2";
import cors from "cors";
import userdb from "./model/userSchema.js";
import connectionToDB from "./db/connection.js";
import rateLimit from "express-rate-limit";


await connectionToDB(); 

const app = express();
app.use(cors({
    origin: ['http://localhost:3000', 
            'https://socialscribe-aipoool.onrender.com', 
            'chrome-extension://dnjmipaneoddchfeamgdabpiomihncii', 
            ],
    methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true
}));

if(process.env.NODE_ENV === 'development'){
    app.use(morgan("dev")); 
}

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20, 
    message: "Too many requests from this IP, please try again after some time"
});

const checkAuthenticated = (req, res, next) => {
    if(req.isAuthenticated()){
        return next(); 
    }
    res.redirect("https://socialscribe-aipoool.onrender.com/login");
}

app.use(limiter);

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
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

passport.use(
        new OAuth2Strategy.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL, 
        scope: ["profile", "email"]
    }, 
    async (accessToken, refreshToken, profile, done) => {
        console.log("Profile: ", profile); 
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

passport.serializeUser((user, done)=>{
    done(null, user.id);
})

passport.deserializeUser((id, done)=>{
    userdb.findById(id).then(user => {
        done(null, user)
    })
})

app.use("/auth" , auth);
app.use("/api", checkAuthenticated , apiRoute);


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



