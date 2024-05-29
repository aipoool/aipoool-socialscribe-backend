import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    accessToken:String, 
    refreshToken:String,
    googleId:String, 
    userName:String, 
    email:String, 
    openAIKey:String, 
    subId:String, 
    stripePriceId:String,
    stripeProductId:String,
    endDate:Number, 
    subType: {
        type:String, 
        default: 'free',
    },
    recurringSuccessful_test: {
        type:Boolean, 
        default:false
    }, 
    hasCancelledSubscription: {
        type:Boolean, 
        default:false
    },
    buttonCounts: {
        type: Number,
        default: 0
    },
    totalCount: {
        type: Number,
        default: 10
    }
},{timestamps:true});

const userdb = new mongoose.model("replai", userSchema);

export default userdb;