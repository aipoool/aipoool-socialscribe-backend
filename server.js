import "dotenv/config";
import chalk from "chalk";
import express from "express";
import morgan from "morgan";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";
import OAuth2Strategy from "passport-google-oauth20";
import cors from "cors";
import userdb from "./model/userSchema.js";
import connectionToDB from "./db/connection.js";
import { postChatGPTMessage } from "./generateComment.js";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import Stripe from "stripe";

const stripe = Stripe(process.env.STRIPE_API_KEY);
const endptSecret = process.env.WEBHOOK_SIGNING_SECRET;

await connectionToDB();

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://socialscribe-aipoool.onrender.com",
      "chrome-extension://bhnpbgfnodkiohanbolcdkibeibncobf",
      "https://www.linkedin.com",
      "https://x.com",
    ],
    methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use("/stripe-webhook", express.raw({ type: "application/json" }));

// Middleware
app.use(express.json());

app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SECRET_SESSION,
    resave: true, //we dont want to save a session if nothing is modified
    saveUninitialized: false, //dont create a session until something is stored
    store: new MongoStore({
      mongoUrl: process.env.DATABASE,
      collection: 'sessions'
    }),
    cookie: {
      maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
      secure: "auto",
      sameSite: "none", //Enable when deployment OR when not using localhost, We're not on the same site, we're using different site so the cookie need to effectively transfer from Backend to Frontend
    },
  })
);

// app.use(
//   session({
//     secret: process.env.SECRET_SESSION,
//     resave: true, //we dont want to save a session if nothing is modified
//     saveUninitialized: true, //dont create a session until something is stored
//     store: new MongoStore({
//       mongoUrl: process.env.DATABASE,
//       collection: 'sessions'
//     })
//   })
// );

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 200,
  message:
    "Too many requests from this IP, please try again after some time--..",
});

const checkAuthenticated = (req, res, next) => {
  console.log("User is authenticated:", req.isAuthenticated()); // Debugging line
  console.log("User session data:", req.session); // Debugging line
  console.log("User data :: " , req); 
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
};


app.use(limiter);

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Methods", "PUT, POST, GET, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
  );
  next();
});

// setup session
/**
 * This session is used to encrypt the user data
 * Similar to jwt token services
 **/
// app.use(session({
//     secret: process.env.SECRET_SESSION,
//     resave: false,
//     saveUninitialized: true
// }))

// setup passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new OAuth2Strategy.Strategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("Profile: ", profile);
      const existingUser = await userdb.findOneAndUpdate(
        { googleId: profile.id },
        {
          accessToken,
          refreshToken,
          googleId: profile.id,
          userName: profile.displayName,
          email: profile.emails[0].value,
        }
      );

      if (existingUser) {
        return done(null, existingUser);
      }

      const newUser = await new userdb({
        accessToken,
        refreshToken,
        googleId: profile.id,
        userName: profile.displayName,
        email: profile.emails[0].value,
      }).save();

      done(null, newUser);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  userdb.findById(id).then((user) => {
    done(null, user);
  });
});

///app.use("/auth" , auth);
/**AUTH FILES ROUTES PASTING HERE FOR CHECKING THE FUNCTIONALITY */

// Testing routes
app.get("/auth/test", (req, res) => {
  res.json({ Hi: "This is the AUTH Route, after the edits have been made " });
});

/**** CHECKING IF WE GET THE DATA IN RETURN ***********/
app.get("/get-user-data", checkAuthenticated, (req, res) => {
  console.log("Request data from get-user-data : ", req.user);
  res.json({ user: req.user });
});

// initial google oauth login
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://socialscribe-aipoool.onrender.com/login",
    successRedirect: "https://socialscribe-aipoool.onrender.com/enter-your-key",
  })
);

app.get("/auth/login/success", async (req, res) => {
  console.log("Request data from login/success : ", req.user);
  if (req.user) {
    res.status(200).json({ message: "User Login", user: req.user });
    //res.send({user:req.user});
    console.log("Entered the login success route..");
  } else {
    res.status(403).json({ message: "User Not Authorized" });
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

app.post("/auth/userdata", checkAuthenticated, async (req, res) => {
  const { id, accessToken } = req.body;
  try {
    if (accessToken) {
      const user = await userdb.findById(id);
      console.log("USER DATA :: : ", user);
      console.log({ results: user });
      res.status(200).json({ results: user });
    }
  } catch (error) {
    console.error("Error retrieving user data", error);
    res.status(500).send({ message: "Error retrieving user data" });
  }
});

app.post("/auth/enter-your-key/success", async (req, res) => {
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

app.get("/auth/logout", async (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("https://socialscribe-aipoool.onrender.com/login");
  });
});

// Testing routes
app.get("/api/test", (req, res) => {
  res.json({ Hi: "This is the API Route" });
});

/**OPENAI API ROUTES */
app.options("/api/generate-response", cors());
app.post("/api/generate-response", checkAuthenticated, async (req, res) => {
  const { post, postImgArray, tone, changesByUser, site, tabId, templatedMsg, postLength, language, styleOfWriting, textByUser , model } = req.body;

  try {
    const comment = await postChatGPTMessage(post, postImgArray, tone, changesByUser, site, tabId, templatedMsg, postLength, language, styleOfWriting, textByUser , model);
    res.json({ results: { comment } });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/setCounter", async (req, res) => {
  const { id, count, accessToken } = req.body;
  console.log(req.body);

  try {
    if (accessToken) {
      const updatedUser = await userdb.findOneAndUpdate(
        { _id: id },
        { $set: { buttonCounts: count } },
        { new: true, useFindAndModify: false }
      );
      console.log("Updated User: ", updatedUser);

      res.send({ message: "Counter updated successfully" });
    }
  } catch (error) {
    console.error("Error updating Counter:", error);
    res.status(500).send({ message: "Error updating Counter" });
  }
});

app.post("/api/getCounter", checkAuthenticated, async (req, res) => {
  const { id, accessToken } = req.body;
  try {
    if (accessToken) {
      const response = await userdb.findById(id);
      console.log("COUNTER GET :: : ", response.buttonCounts);
      console.log("TOTAL COUNT :: : ", response.totalCount);
      res.status(200).json({
        count: response.buttonCounts,
        totalCount: response.totalCount,
      });
    }
  } catch (error) {
    console.error("Error getting Counter:", error);
    res.status(500).send({ message: "Error getting Counter" });
  }
});

app.post("/api/check", async (req, res) => {
  const { key } = req.body;

  const openai = new OpenAI({ apiKey: key });

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: "Checking the key..." }],
      model: "gpt-3.5-turbo",
    });

    const isValid = completion?.choices[0]?.message?.content ? true : false;
    console.log(isValid);
    console.log({ isValid });
    res.status(200).json({ isValid });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ isValid: false });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  /** ACCEPT THE EMAIL VIA BODY TO HARDCODE IT INTO THE PAYMENT BLANK */
  const { data } = req.body;

  const userEmail = data.userEmail;
  const mongoId = data.userMongoId;
  const typeOfPlan = data.type;
  const StripeProductId = data.productId;
  const StripePriceId = data.priceId;

  let customer;
  const auth0UserId = userEmail;
  console.log("Data Here :::: ", data);
  console.log(`${data.plan} ::::: ${data.price} :::::: ${mongoId}`);

  /** CHECK IF THE CUSTOMER IS PRESENT IN THE STRIPE CUSTOMER'S LIST */
  const existingCustomers = await stripe.customers.list({
    email: userEmail,
    limit: 1,
  });

  /** CHECK IF THERE IS SOME ACTIVE SUBSCRIPTION ALREADY */
  if (existingCustomers.data.length > 0) {
    // Customer already exists
    customer = existingCustomers.data[0];

    // Check if the customer already has an active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      // Customer already has an active subscription, send them to biiling portal to manage subscription

      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: "https://socialscribe-aipoool.onrender.com/success",
      });
      //return res.status(409).json({ redirectUrl: stripeSession.url });

      return res.json({ redirectUrl: stripeSession.url });
    }
  } else {
    // No customer found, create a new one
    customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        userId: auth0UserId, // Replace with actual Auth0 user ID
        mongoId: mongoId,
        priceId: StripePriceId,
        productId: StripeProductId,
        type: typeOfPlan,
      },
    });
  }

  console.log(`Customer::::::`);
  console.log(customer);

  console.log("Customer ID ::: ", customer.id);

  // const lineItems = [
  //   {
  //     price_data: {
  //       currency: "inr",
  //       product_data: {
  //         name: data.plan,
  //         description: `This is the ${data.plan} version.`,
  //       },
  //       unit_amount: data.price * 100,
  //       recurring: {
  //         interval: "month",
  //       },
  //     },
  //     quantity: 1,
  //   },
  // ];

  const lineItems = [
    {
      price: StripePriceId,
      quantity: 1,
    },
  ];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    billing_address_collection: "auto",
    mode: "subscription",
    success_url: "https://socialscribe-aipoool.onrender.com/success",
    cancel_url: "https://socialscribe-aipoool.onrender.com/cancel",
    metadata: {
      userId: auth0UserId,
      mongoId: mongoId,
      priceId: StripePriceId,
      productId: StripeProductId,
      type: typeOfPlan,
    },
    customer: customer.id,
  });

  console.log("Session ID Here ::: ", session.id);

  res.json({ id: session.id });
});

// webhook for subscription
app.post("/stripe-webhook", async (req, res) => {
  let event = req.body;

  if (endptSecret) {
    // Get the signature sent by Stripe
    const signature = req.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, endptSecret);
      console.log("Event Type ::: ", event.type);
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return res.sendStatus(400);
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;

    // On payment successful, get subscription and customer details
    const subscription = await stripe.subscriptions.retrieve(
      event.data.object.subscription
    );
    const customer = await stripe.customers.retrieve(
      event.data.object.customer
    );

    console.log(
      `Subscription from the PAYMENT SUCCEEDED :::::: `,
      subscription
    );

    if (invoice.billing_reason === "subscription_create") {
      // Getting the mongoId from the metadata -

      const mongoId = customer?.metadata?.mongoId;
      const typeOfPlan = customer?.metadata?.type;
      const priceId = customer?.metadata?.priceId;
      const productId = customer?.metadata?.productId;

      // calling the database and getting the totalcounts

      let infoDB = await userdb.findById(mongoId);
      let dbTotalCount = infoDB.totalCount;
      console.log(dbTotalCount);
      let updatePlanCount;
      if (typeOfPlan === "premium") {
        updatePlanCount = dbTotalCount + 10;
      } else {
        updatePlanCount = dbTotalCount + 30;
      }
      const result = await userdb.findOneAndUpdate(
        { _id: mongoId },
        {
          $set: {
            subId: event.data.object.subscription,
            endDate: subscription.current_period_end * 1000,
            totalCount: updatePlanCount,
            subType: typeOfPlan,
            stripePriceId: priceId,
            stripeProductId: productId,
          },
        },
        { new: true, useFindAndModify: false }
      );

      console.log(`A document was inserted with the invoice ID: ${invoice.id}`);
      console.log(
        `First subscription payment successful for Invoice ID: ${customer.email} ${customer?.metadata?.userId}`
      );
    } else if (
      invoice.billing_reason === "subscription_cycle" ||
      invoice.billing_reason === "subscription_update"
    ) {
      // Handle recurring subscription payments
      console.log(
        `Subscription from the RECURRING PAYMENT :::::: `,
        subscription
      );
      console.log(`CHANGED PLAN HERE  :::::: `, subscription.plan);

      const mongoId = customer?.metadata?.mongoId;
      let updatePlanCount, typeOfPlan;
      const priceId = subscription?.plan?.id;
      const productId = subscription?.plan?.product;
      // calling the database and getting the totalcounts
      let infoDB = await userdb.findById(mongoId);
      let dbTotalCount = infoDB.totalCount;

      if (priceId === "price_1PKzSsSGYG2CnOjsDpM6cUau") {
        updatePlanCount = dbTotalCount + 10;
        typeOfPlan = "premium";
      } else {
        updatePlanCount = dbTotalCount + 30;
        typeOfPlan = "pro";
      }
      const result = await userdb.findOneAndUpdate(
        { _id: mongoId },
        {
          $set: {
            endDate: subscription.current_period_end * 1000,
            recurringSuccessful_test: true,
            totalCount: updatePlanCount,
            subType: typeOfPlan,
            stripePriceId: priceId,
            stripeProductId: productId,
          },
        },
        { new: true, useFindAndModify: false }
      );

      if (result.matchedCount === 0) {
        console.log("No documents matched the query. Document not updated");
      } else if (result.modifiedCount === 0) {
        console.log(
          "Document matched but not updated (it may have the same data)"
        );
      } else {
        console.log(`Successfully updated the document`);
      }

      console.log(
        `Recurring subscription payment successful for Invoice ID: ${invoice.id}`
      );
    }

    console.log(
      new Date(subscription.current_period_end * 1000),
      subscription.status,
      invoice.billing_reason
    );
  }

  // For canceled/renewed subscription
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;

    const customer = await stripe.customers.retrieve(
      event.data.object.customer
    );
    console.log(subscription); 
    console.log(subscription.cancel_at_period_end);

    // console.log(event);
    if (subscription.cancel_at_period_end) {
      console.log(`Subscription ${subscription.id} was canceled.`);
      const mongoId = customer?.metadata?.mongoId;

      // await stripe.subscriptions.update(subscription.id, {
      //   cancel_at_period_end: true,
      // });

      const result = await userdb.findOneAndUpdate(
        {
          _id: mongoId,
        },
        {
          $unset: {
            endDate: "",
            subId: "",
            recurringSuccessful_test: false,
            stripePriceId: "",
            stripeProductId: "",
          },
          $set: {
            subType: "free",
            hasCancelledSubscription: true,
          },
        }
      );

      console.log("Customer from CANCEL SUBSCRIPTION :::: ", customer); // we're getting the data
      console.log("Subscription after CANCEL SUBSCRIPTION :::: ", subscription); // we're getting
      
    } else {
      ///calling the database and getting the totalcounts
      const mongoId = customer?.metadata?.mongoId;
      let infoDB = await userdb.findById(mongoId);
      let dbTotalCount = infoDB.totalCount;
      let hasCancelledSubscription = infoDB.hasCancelledSubscription;
      console.log("Has cancelled plan ::: " , hasCancelledSubscription); 

      if (hasCancelledSubscription) {
        const subscriptionsUpdated = await stripe.subscriptions.list({
          customer: customer.id,
        });

        console.log(
          "Subscription plan ::: ",
          subscriptionsUpdated.data[0].plan
        );
        console.log(customer?.metadata);

        const priceId = subscriptionsUpdated.data[0].plan?.id;
        const productId = subscriptionsUpdated.data[0].plan?.product;

        console.log(`Original details ::::: ${customer?.metadata.priceId} --> 
        ${customer?.metadata.productId} --> ${customer?.metadata.type}`);

        console.log("Customer from RESTARTED SUBSCRIPTION :::: ", customer); // we're getting the data

        let updatePlanCount, typeOfPlan;
        if (priceId === "price_1PKzSsSGYG2CnOjsDpM6cUau") {
          updatePlanCount = dbTotalCount + 10;
          typeOfPlan = "premium";
        } else {
          updatePlanCount = dbTotalCount + 30;
          typeOfPlan = "pro";
        }

        console.log(`Changed to details ::::: ${priceId} -->
      ${productId} --> ${typeOfPlan}`);

        const result = await userdb.findOneAndUpdate(
          { _id: mongoId },
          {
            $set: {
              endDate: subscription.current_period_end * 1000, // need to check this!!!
              recurringSuccessful_test: true,
              totalCount: updatePlanCount,
              subType: typeOfPlan,
              stripePriceId: priceId,
              stripeProductId: productId,
              hasCancelledSubscription: false,
            },
          },
          { new: true, useFindAndModify: false }
        );
      }
    }
  }

  res.status(200).end();
});

// Testing routes
app.get("/test", (req, res) => {
  res.json({ Hi: "This is a... testing message" });
});

const PORT = process.env.PORT || 1997;

app.listen(PORT, () => {
  console.log(
    `${chalk.green.bold("✅")} 👍Server running in ${chalk.yellow.bold(
      process.env.NODE_ENV
    )} mode on port ${chalk.blue.bold(PORT)}`
  );
});
