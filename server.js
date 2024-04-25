import chalk from "chalk";
import cookieParser from "cookie-parser";
import "dotenv/config"; 
import express from "express";
import morgan from "morgan";
import { postChatGPTMessage } from "./generateComment.js";
import cors from "cors";
//var cors = require("cors");

const app = express();

if(process.env.NODE_ENV === 'development'){
    app.use(morgan("dev")); 
}

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
       next();
 });


// Middleware 
app.use(express.json()); 

// URL Encoded payloads 
app.use(express.urlencoded({extended: false}));

// Testing routes 
app.get("/test", (req, res) => {
    res.json({Hi: "This is a testing message"}); 
})

app.options("/generate-response" , cors()); 

app.post("/generate-response", cors() , async (req, res) => {
    const {post, tone, openAIKey} = req.body; 
    //console.log(req.body);

    try{
        const comment = await postChatGPTMessage(post , tone, openAIKey); 
        res.json({results: {comment}}); 

    }catch(err){
        console.log(err); 
        res.status(500).json({error: err.message});  
    }
})

const PORT = process.env.PORT || 1997; 

app.listen(PORT , ()=> {
    console.log(`Server running on ${PORT}`)
})


