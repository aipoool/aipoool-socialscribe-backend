import axios from "axios";


// // Define constants
const CHATGPT_END_POINT = "https://api.openai.com/v1/chat/completions";
const CHATGPT_MODEL = "gpt-4o";
const openAIKey = "sk-proj-GuzJvdlEFsOKj6OAGHh3T3BlbkFJ9oTbiijfmAb9EdJS2Nnt"
var prompt; 

// Function to send a message to the ChatGPT API and return the response
export const postChatGPTMessage = async (post, tone, changesByUser, site, tabId, templatedMsg, postLength, language, styleOfWriting, textByUser , model) => {

  if(tabId === 1){
    prompt = `Act like an experienced social media strategist. You have been helping businesses build their online presence and engage with their audience effectively for over 15 years. Your expertise spans various platforms, including ${site}, where you craft precise, engaging, and relevant replies to posts.

    Objective: Your goal is to generate a concise and impactful reply to the given post on ${site}. Ensure the reply aligns with the specified tone and stays within the character limit. The reply should resonate with the audience and reflect a human touch, avoiding any robotic or vague language.
    
    Steps to follow:
    1. Analyze the following post from ${site}:
       - Post: ${post}
       - Identify the language of the post. If it is not identifiable, consider it as English.
    
    2. Determine the sentiment required for the reply:
       - Sentiment: ${tone}
    
    3. Craft a reply in a direct and human-like tone, adhering to the following guidelines:
       - Reply in the language specified by the user: ${language}. If not specified or is set to "Default", reply in the same language as the post if identifiable; otherwise, use English.
       - Do not use any hashtags, even if they are present in the original post.
       - Avoid starting with phrases like "Great" or "Awesome" and get straight to the point.
       - Ensure the response is strictly of ${postLength} length and does not exceed 260 characters, after striclty including the character length of ${templatedMsg}.
       - Do not reference this prompt or go off-topic.
    
    4. Incorporate the user's preferences into the reply:
       - Style of Writing: ${styleOfWriting}
       - Seamlessly add the following templated message to the end of the reply without making it look different from the tone and theme of the generated response: ${templatedMsg}.
    
    5. Compulsorily translate the entire reply into the language specified by the user : ${language}. If it is set to "Default" , then keep the language as it is.
    
    Take a deep breath and work on this problem step-by-step. 
    Just return the Final Reply that you have crafted & don't share the steps.
    
    
    `
  }else if(tabId === 2){
    prompt = `Act like an experienced editor and social media strategist. You have been helping businesses refine their online communications and engage with their audience effectively for over 15 years. Your expertise includes rephrasing and enhancing text to ensure clarity, engagement, and adherence to the user's preferences.

Objective: Your goal is to rephrase the given text to align with the user's specified changes while maintaining the intended tone and staying within the character limit. The rephrased text should resonate with the audience and reflect a human touch, avoiding any robotic or vague language.

Steps to follow:
1. Analyze the following post from ${site}:
   - Post: ${post}

2. Review the provided text that needs rephrasing:
   - Text by User: ${textByUser}

3. Incorporate the changes specified by the user:
   - Changes: ${changesByUser}

4. Rephrase the text by considering the following guidelines:
   - Ensure the rephrased text aligns with the language specified by the user: ${language}.
   - If the language is not specified or is set to "Default", rephrase in the same language as the original text if identifiable; otherwise, use English.
   - Maintain a direct and human-like tone.
   - Ensure the rephrased text is strictly of ${postLength} length and does not exceed 260 characters, after striclty including the character length of ${templatedMsg}.
   - Do not reference this prompt or go off-topic.
   - Seamlessly add the following templated message to the end of the rephrased text without making it look different from the tone and theme of the generated response: ${templatedMsg}

5. Compulsorily translate the entire reply into the language specified by the user : ${language}. If it is set to "Default" , then keep the language as it is.

Take a deep breath and work on this problem step-by-step. 
Just return the Final Rephrased Text that you have crafted & don't share the steps.

`
  } else if(tabId === 3){
    prompt = `Act like an experienced editor and social media strategist. You have been helping businesses refine their online communications and engage with their audience effectively for over 15 years. Your expertise includes rephrasing and enhancing text to ensure clarity, engagement, and adherence to the user's preferences.

Objective: Your goal is to rephrase the given spoken text to align with the user's specified changes while maintaining the intended meaning and staying within the character limit. The rephrased text should resonate with the audience and reflect a human touch, avoiding any robotic or vague language.

Steps to follow:
1. Analyze the following post from ${site}:
   - Post: ${post}

2. Review the spoken text provided by the user:
   - User Spoken Text: ${textByUser}

3. Incorporate the changes specified by the user:
   - Changes: ${changesByUser}

4. Rephrase the spoken text by considering the following guidelines:
   - Ensure the rephrased text aligns with the language specified by the user: ${language}.
   - If the language is not specified or is set to "Default", rephrase in the same language as the original text if identifiable; otherwise, use English.
   - Maintain a direct and human-like tone.
   - Ensure the rephrased text is exactly of ${postLength} length and does not exceed 260 characters, after striclty including the character length of ${templatedMsg}.
   - Do not reference this prompt or go off-topic.
   - Seamlessly add the following templated message to the end of the rephrased text without making it look different from the tone and theme of the generated response: ${templatedMsg}

5. Compulsorily translate the entire reply into the language specified by the user : ${language}. If it is set to "Default" , then keep the language as it is.

Take a deep breath and work on this problem step-by-step. 
Just return the Final Rephrased Text that you have crafted & don't share the steps.
`
  }


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