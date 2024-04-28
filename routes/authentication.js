import express from 'express';
import passport from 'passport';
import userdb from '../model/userSchema.js';
const router = express.Router();
import cors from 'cors';

// Testing routes 
router.get("/test", (req, res) => {
  res.json({Hi: "This is the AUTH Route"}); 
})


// initial google oauth login 
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport.authenticate("google", 
{ 
    failureRedirect: "http://localhost:3000/login", 
    successRedirect: "http://localhost:3000/enter-your-key"
}));

router.post("/userdata", async (req, res) => {
    const { email, openAIKey } = req.body;
    //console.log("Path is enter-your-key/success ",email, openAIKey);
    try {
      await userdb.findOneAndUpdate(
        { email: email },
        { openAIKey: openAIKey },
        { new: true }
      );
      res.send({ message: 'OpenAI Key updated successfully' });
    } catch (error) {
      console.error('Error updating OpenAI Key:', error);
      res.status(500).send({ message: 'Error updating OpenAI Key' });
    }
});

router.post("/setCounter", cors() , async(req, res) => {
  const {id, count} = req.body; 
  console.log(req.body); 

  try{
      const updatedUser = await userdb.findOneAndUpdate(
          {_id: id}, 
          {$set: {buttonCounts: count}}, 
          {new: true, useFindAndModify: false}
      );

      console.log("Updated User: ", updatedUser); 

      res.send({message: 'Counter updated successfully'});
  }catch (error) {
      console.error('Error updating Counter:', error);
      res.status(500).send({ message: 'Error updating Counter' });
    }
});


router.post("/getCounter", cors() , async(req, res) => {
    const {id} = req.body; 
    try{
        const response = await userdb.findById(id);

        console.log("COUNTER GET :: : ", response.buttonCounts);

        res.status(200).json({count:response.buttonCounts});
    }catch (error) {
        console.error('Error getting Counter:', error);
        res.status(500).send({ message: 'Error getting Counter' });
      }
})

//module.exports = router; 

export default router;