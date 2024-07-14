const checkAuthenticated = (req, res, next) => {
    console.log("User is authenticated:", req.isAuthenticated()); // Debugging line
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: "Not authenticated" });
  };


export default checkAuthenticated; 