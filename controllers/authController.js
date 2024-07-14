export const loginSuccess = (req, res) => {
    console.log("Request data from login/success : ", req.user);
    if (req.user) {
      res.status(200).json({ message: "User Login", user: req.user });
    } else {
      res.status(403).json({ message: "User Not Authorized" });
    }
};

export const logout = (req, res, next) => {
  req.logout(function (err) {
    if (err) {
       return next(err); 
    }
    res.redirect('https://socialscribe-aipoool.onrender.com/login');
  });
}