import express from 'express';
import passport from 'passport';
import userdb from '../model/userSchema.js';
const router = express.Router();


// Testing routes 
router.get("/test", (req, res) => {
  res.json({Hi: "This is the AUTH Route, after the edits have been made "}); 
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

/**GENERAL BACKEND ROUTES */
router.get("/login/success", async (req, res) => {
  console.log("Request data from login/success : ", req.user); 
  if(req.user){
      res.status(200).json({message: "User Login" , user:req.user});
  }
  else{
      res.status(403).json({message: "User Not Authorized"});
  }
  // if(req.user){
  //     //console.log(req.user.accessToken)
  //     console.log(req.user)
  //     if(req.user.accessToken){
  //         res.status(200).json({message: "User Login" , user:req.user});
  //         console.log(req.user); 
  //         //const User = req.user;
  //         // // setting the jwt token 
  //         // jwt.sign({User}, process.env.JWT_KEY, (err, token) => {
  //         //     res.status(200);
  //         //     res.send({User, auth: token});
  //         // })
  //     }
      
  // }else {
  //     res.status(400).json({message: "Not Authorized"}); 
  // }
});

router.post("/enter-your-key/success", async (req, res) => {
  const { id, openAIKey } = req.body;
  console.log("Path is enter-your-key/success ",id, openAIKey);
  try {
    await userdb.findOneAndUpdate(
      { _id: id },
      {$set: {
          openAIKey: openAIKey} },
      { new: true, useFindAndModify: false }
    );
    res.send({ message: 'OpenAI Key updated successfully' });
  } catch (error) {
    console.error('Error updating OpenAI Key:', error);
    res.status(500).send({ message: 'Error updating OpenAI Key' });
  }
});

router.get('/logout', async (req, res, next) => {

  req.logout(function(err) {
    if (err) {
       return next(err); 
    }
    res.redirect('http://localhost:3000/login');
  });

});


export default router;