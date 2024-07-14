import userdb from "../model/userSchema.js";
import { postChatGPTMessage } from "../controllers/apiController.js";
import checkAuthenticated from "../middlewares/authMiddleware.js";

router.get("/test", (req, res) => {
    res.json({ Hi: "This is the API Route" });
  });
  
router.options("/generate-response", cors());
router.post("/generate-response", checkAuthenticated, async (req, res) => {
    const { post, postImgArray, tone, changesByUser, site, tabId, templatedMsg, postLength, language, styleOfWriting, textByUser , model } = req.body;

    try {
        const comment = await postChatGPTMessage(post, postImgArray, tone, changesByUser, site, tabId, templatedMsg, postLength, language, styleOfWriting, textByUser , model);
        res.json({ results: { comment } });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
}
});
  
router.post("/setCounter", checkAuthenticated, async (req, res) => {
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
  
router.post("/getCounter", checkAuthenticated, async (req, res) => {
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
  
  /**WILL BE REMOVING ONCE THE CHANGES ARE BEING MADE COMPLETELY */
router.post("/check", async (req, res) => {
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

router.post("/create-checkout-session", async (req, res) => {
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
  
