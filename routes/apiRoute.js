import express from 'express';
import userdb from '../model/userSchema.js';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import {postChatGPTMessage} from '../generateComment.js';

const router = express.Router();


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


router.post("/setCounter", cors() , async(req, res) => {
    const {id, count, accessToken} = req.body; 
    console.log(req.body); 
  
    try{
        if(accessToken){
          const updatedUser = await userdb.findOneAndUpdate(
            {_id: id}, 
            {$set: {buttonCounts: count}}, 
            {new: true, useFindAndModify: false}
          );
          console.log("Updated User: ", updatedUser); 
  
          res.send({message: 'Counter updated successfully'});
        }
  
    }catch (error) {
        console.error('Error updating Counter:', error);
        res.status(500).send({ message: 'Error updating Counter' });
      }
});
  
  
  router.post("/getCounter", cors() , async(req, res) => {
      const {id, accessToken} = req.body; 
      try{
          if(accessToken){
            const response = await userdb.findById(id);
            console.log("COUNTER GET :: : ", response.buttonCounts);
            res.status(200).json({count:response.buttonCounts});
          }
  
      }catch (error) {
          console.error('Error getting Counter:', error);
          res.status(500).send({ message: 'Error getting Counter' });
        }
});



export default router;