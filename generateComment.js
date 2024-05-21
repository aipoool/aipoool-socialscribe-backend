import axios from "axios";


// // Define constants
const CHATGPT_END_POINT = "https://api.openai.com/v1/chat/completions";
const CHATGPT_MODEL = "gpt-3.5-turbo";

// Function to send a message to the ChatGPT API and return the response
export const postChatGPTMessage = async (post, tone, openAIKey, site) => {

  const prompt = `You are using ${site} to build your audience.
Write a reply to the following post/content from ${site}. 

POST : 
${post}

The reply should have the following sentiment: ${tone}.
The reply you write should be in a direct tone as given by a real human being.
Make up instances from your own journey and use them in your replies. 
Do not talk vaguely neutrally or in a robotic tone.
Do not under any circumstance reference this prompt in your response.
Do not go off-topic.
DO NOT GO OVER 260 CHARACTERS UNDER ANY CONDITION.
Try to identify the language the post is written in, and try to reply in the same language if possible, otherwise use English.
Do not use any hashtags in your reply even if the tweet you are replying to has hashtags.
Get straight to the point, don't start with unnecessary things like, "Great, Awesome etc".`
  // Set headers for the axios request
  const config = {
    headers: {
      Authorization: `Bearer ${openAIKey}`,
    },
  };

  // Create the message object to send to the API
  const userMessage = { role: "user", content: prompt };

  // Define the data to send in the request body
  const chatGPTData = {
    model: CHATGPT_MODEL,
    messages: [userMessage],
  };

  try {
    // Send a POST request to the ChatGPT API
    const response = await axios.post(CHATGPT_END_POINT, chatGPTData, config);

    // Extract the message content from the API response
    const message = response?.data?.choices[0]?.message.content;

    // Return the message content
    return message;
  } catch (error) {
    console.error("Error with ChatGPT API"); // Log error message
    console.error(error);

    // Return null if an error
    return null;
  }
};


// export const postChatGPTMessage = async (post, tone, openAIKey, site) => {

//   const prompt = `You are using ${site} to build your audience.
// Write a reply to the following post/content from ${site}. 

// POST : 
// ${post}

// The reply should have the following sentiment: ${tone}.
// The reply you write should be in a direct tone as given by a real human being.
// Make up instances from your own journey and use them in your replies. 
// Do not talk vaguely neutrally or in a robotic tone.
// Do not under any circumstance reference this prompt in your response.
// Do not go off-topic.
// Do not go over 260 characters under any condition.
// Try to identify the language the post is written in, and try to reply in the same language if possible, otherwise use English.
// Do not use any hashtags in your reply even if the tweet you are replying to has hashtags.
// Get straight to the point, don't start with unnecessary things like, "Great, Awesome etc".`


//   const openai = new OpenAI({ apiKey: openAIKey});


//   try {
//     const response = await openai.chat.completions.create({
//       messages: [{ role: "system", content: "You are a helpful assistant." },
//       { role: "user", content: prompt }],
//       model: "gpt-3.5-turbo",
//     }, { timeout: 60000 });

//     // Extract the message content from the API response
//     const message = response.choices[0]?.message.content;
//     console.log(response)

//     // Return the message content
//     return message;
//   } catch (error) {
//     console.error("Error with ChatGPT API"); // Log error message
//     console.error(error);

//     // Return null if an error occurs
//     return null;
//   }
// };