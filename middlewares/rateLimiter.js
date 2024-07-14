import rateLimit from "express-rate-limit";

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 200,
    message:
      "Too many requests from this IP, please try again after some time--..",
  });

export default limiter; 