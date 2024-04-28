import express from 'express';
import userdb from '../model/userSchema.js';
const router = express.Router();
import cors from 'cors';
import jwt from 'jsonwebtoken';
import {postChatGPTMessage} from '../generateComment.js';


// Testing routes 
router.get("/test", (req, res) => {
    res.json({Hi: "This is the API Route"}); 
})

/**OPENAI API ROUTES */
router.options("/generate-response" , cors()); 
router.post("/generate-response", cors() , async (req, res) => {
    const {post, tone, openAIKey} = req.body; 
    
    try{
        const comment = await postChatGPTMessage(post , tone, openAIKey); 
        res.json({results: {comment}}); 

    }catch(err){
        console.log(err); 
        res.status(500).json({error: err.message});  
    }
})

/**GENERAL BACKEND ROUTES */
router.get("/login/success", async (req, res) => {
    if(req.user){
        console.log(req.user.accessToken)
        if(req.user.accessToken){
            //res.status(200).json({message: "User Login" , user:req.user});
            const User = req.user;

            // setting the jwt token 
            jwt.sign({User}, process.env.JWT_KEY, (err, token) => {
                res.send({User, auth: token});
            })
        }
        
    }else {
        res.status(400).json({message: "Not Authorized"}); 
    }
});

router.post("/enter-your-key/success", async (req, res) => {
    const { id, openAIKey } = req.body;
    console.log("Path is enter-your-key/success ",id, openAIKey);
    try {
      await userdb.findOneAndUpdate(
        { _id: id },
        {$set:{ openAIKey: openAIKey }},
        { new: true }
      );
      res.send({ message: 'OpenAI Key updated successfully' });
    } catch (error) {
      console.error('Error updating OpenAI Key:', error);
      res.status(500).send({ message: 'Error updating OpenAI Key' });
    }
});


export default router;