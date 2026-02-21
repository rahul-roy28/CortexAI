//

import "dotenv/config";

const getOpenAIAPIResponse = async (messages) => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages, // ✅ full conversation
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API Error:", errorData);
      throw new Error(errorData.error?.message || "OpenAI request failed");
    }

    const data = await response.json();

    if (!data.choices || !data.choices.length) {
      throw new Error("No response from OpenAI");
    }

    return data.choices[0].message.content;
  } catch (err) {
    console.error("OpenAI Error:", err.message);
    return "Sorry, something went wrong while generating the response.";
  }
};

export default getOpenAIAPIResponse;
