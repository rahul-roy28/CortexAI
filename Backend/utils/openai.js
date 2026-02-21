import "dotenv/config";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const FALLBACK_REPLY = "Sorry, something went wrong while generating the response.";

const createRequestBody = (messages, stream = false) => ({
  model: "gpt-4o-mini",
  messages,
  temperature: 0.7,
  stream,
});

const getOpenAIAPIResponse = async (messages) => {
  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(createRequestBody(messages, false)),
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
    return FALLBACK_REPLY;
  }
};

const streamOpenAIAPIResponse = async (messages, onToken) => {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(createRequestBody(messages, true)),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "OpenAI stream request failed");
  }

  if (!response.body) {
    throw new Error("OpenAI stream did not return a body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.replace(/^data:\s*/, "");
      if (payload === "[DONE]") {
        return fullText;
      }

      try {
        const parsed = JSON.parse(payload);
        const token = parsed.choices?.[0]?.delta?.content || "";
        if (token) {
          fullText += token;
          onToken(token);
        }
      } catch {
        // Ignore partial/unknown stream lines.
      }
    }
  }

  return fullText;
};

export { getOpenAIAPIResponse, streamOpenAIAPIResponse, FALLBACK_REPLY };
