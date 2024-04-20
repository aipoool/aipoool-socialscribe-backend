import chalk from "chalk";
import cookieParser from "cookie-parser";
import "dotenv/config"; 
import express from "express";
import morgan from "morgan";
import { postChatGPTMessage } from "./generateComment.js";

const app = express();

if(process.env.NODE_ENV === 'development'){
    app.use(morgan("dev")); 
}


// Middleware 
app.use(express.json()); 

// URL Encoded payloads 
app.use(express.urlencoded({extended: false}));

// Testing routes 
app.get("/test", (req, res) => {
    res.json({Hi: "This is a testing message"}); 
})

app.post("/generate-response" , async (req, res) => {
    const {post, tone, openAIKey} = req.body; 

    try{
        const prompt = `As a professional writer, craft a succinct comment on the given LinkedIn post. Ensure your response aligns with the specified tone. \n\nLinkedIn Post: \n${post}\nDesired Tone: \n${tone}.`
        const comment = await postChatGPTMessage(prompt, openAIKey); 
        res.json({results: {comment}}); 

    }catch(err){
        console.log(err); 
        res.status(500).json({err}); 
    }
})

const PORT = process.env.PORT || 1997; 

app.listen(PORT , ()=> {
    console.log(`Server running on ${PORT}`)
})


