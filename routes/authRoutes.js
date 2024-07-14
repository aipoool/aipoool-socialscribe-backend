import express from 'express';
import passport from 'passport';
import { loginSuccess, logout } from '../controllers/authController.js';
import checkAuthenticated from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get("/test", (req, res) => {
    res.json({ Hi: "This is the AUTH Route, after the modular edits have been made " });
  });

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: 'https://socialscribe-aipoool.onrender.com/login',
    successRedirect: 'https://socialscribe-aipoool.onrender.com/enter-your-key',
}));

router.post("/userdata", checkAuthenticated, async (req, res) => {
    const { id, accessToken } = req.body;
    try {
      if (accessToken) {
        const user = await userdb.findById(id);
        console.log({ results: user });
        res.status(200).json({ results: user });
      }
    } catch (error) {
      console.error("Error retrieving user data", error);
      res.status(500).send({ message: "Error retrieving user data" });
    }
  });

router.post("/enter-your-key/success", async (req, res) => {
    const { id, openAIKey } = req.body;
    console.log("Path is enter-your-key/success ", id, openAIKey);
    try {
      await userdb.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            openAIKey: openAIKey,
          },
        },
        { new: true, useFindAndModify: false }
      );
      res.send({ message: "OpenAI Key updated successfully" });
    } catch (error) {
      console.error("Error updating OpenAI Key:", error);
      res.status(500).send({ message: "Error updating OpenAI Key" });
    }
  });

router.get('/login/success', loginSuccess);
router.get('/logout', logout);

export default router;
