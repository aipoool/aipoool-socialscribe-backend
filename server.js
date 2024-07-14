import "dotenv/config";
import chalk from "chalk";
import express from "express";
import morgan from "morgan";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import passport from "passport";
import connectionToDB from "./config/connection.js";
import limiter from "./middlewares/rateLimiter.js";
import authRoutes from './routes/authRoutes.js'; 
import apiRoutes from './routes/apiRoutes.js'; 
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
app.use(limiter);

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


if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Methods", "PUT, POST, GET, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
  );
  next();
});

// setup passport
app.use(passport.initialize());
app.use(passport.session());

/***************************ROUTES STARTS HERE ************************ 
 * ******************************************************************
*/

// Testing routes
app.get("/test", (req, res) => {
  res.json({ Hi: "This is a... testing message" });
});

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);



// Testing routes
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



const PORT = process.env.PORT || 1997;

app.listen(PORT, () => {
  console.log(
    `${chalk.green.bold("✅")} 👍Server running in ${chalk.yellow.bold(
      process.env.NODE_ENV
    )} mode on port ${chalk.blue.bold(PORT)}`
  );
});
