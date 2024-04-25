import axios from "axios";

// Define constants
const CHATGPT_END_POINT = "https://api.openai.com/v1/chat/completions";
const CHATGPT_MODEL = "gpt-3.5-turbo";

// Function to send a message to the ChatGPT API and return the response
export const postChatGPTMessage = async (post , tone, openAIKey) => {
  // Set headers for the axios request
  const config = {
    headers: {
      Authorization: `Bearer ${openAIKey}`,
    },
  };

  const prompt = `Consider yourself as a professional comment writer , based on the given LinkedIn post , generate a response , maintaining the tone in the response generated and keeping the 
  response short and to the point. \n\n LinkedIn Post : ${post} \n\n Tone : ${tone}`;

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

    // Return null if an error occurs
    return null;
  }
};