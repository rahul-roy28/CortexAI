import express from "express";
import Thread from "../models/Thread.js";
import {
  FALLBACK_REPLY,
  getOpenAIAPIResponse,
  streamOpenAIAPIResponse,
} from "../utils/openai.js";

const router = express.Router();

const buildThreadTitle = async (firstMessage) => {
  const titlePrompt = [
    {
      role: "user",
      content: `Generate a short 5-word title for this conversation: "${firstMessage}"`,
    },
  ];

  const smartTitleRaw = await getOpenAIAPIResponse(titlePrompt);
  const normalizedTitle =
    typeof smartTitleRaw === "string"
      ? smartTitleRaw.replace(/^["']|["']$/g, "").trim()
      : "";

  if (
    !normalizedTitle ||
    normalizedTitle.toLowerCase().includes(FALLBACK_REPLY.toLowerCase())
  ) {
    return "New Chat";
  }

  return normalizedTitle;
};

// Test
router.post("/test", async (req, res) => {
  try {
    const thread = new Thread({
      threadId: "testThreadId_2",
      title: "Test Thread_2",
    });
    const response = await thread.save();
    res.send(response);
  } catch (err) {
    console.log("Error creating thread:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all threads
router.get("/thread", async (req, res) => {
  try {
    const threads = await Thread.find({}).sort({ updatedAt: -1 });
    res.json(threads);
  } catch (err) {
    console.log("Error fetching threads:", err);
    res.status(500).json({ error: "Faild to fatch threads" });
  }
});

// Get a specific thread by ID
router.get("/thread/:threadId", async (req, res) => {
  const { threadId } = req.params;

  try {
    const thread = await Thread.findOne({ threadId });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(thread.messages);
  } catch (err) {
    console.log("Error fetching thread:", err);
    res.status(500).json({ error: "Failed to fetch thread" });
  }
});

// Rename thread by ID
router.patch("/thread/:threadId", async (req, res) => {
  const { threadId } = req.params;
  const cleanTitle = typeof req.body?.title === "string" ? req.body.title.trim() : "";

  if (!cleanTitle) {
    return res.status(400).json({ error: "Non-empty title is required" });
  }

  try {
    const thread = await Thread.findOneAndUpdate(
      { threadId },
      { title: cleanTitle, updatedAt: new Date() },
      { new: true },
    );

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json({ success: true, threadId: thread.threadId, title: thread.title });
  } catch (err) {
    console.log("Error renaming thread:", err);
    res.status(500).json({ error: "Failed to rename thread" });
  }
});

// Delete a thread by ID
router.delete("/thread/:threadId", async (req, res) => {
  const { threadId } = req.params;

  try {
    const thread = await Thread.findOneAndDelete({ threadId });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    } else {
      res.status(200).json({ success: "Thread deleted successfully" });
    }
  } catch (err) {
    console.log("Error deleting thread:", err);
    res.status(500).json({ error: "Failed to delete thread" });
  }
});

// Handle non-stream chat messages
router.post("/chat", async (req, res) => {
  const { threadId, message } = req.body;
  const cleanMessage = typeof message === "string" ? message.trim() : "";

  if (!threadId || !cleanMessage) {
    return res
      .status(400)
      .json({ error: "Thread ID and non-empty message are required" });
  }

  try {
    let thread = await Thread.findOne({ threadId });
    if (!thread) {
      const smartTitle = await buildThreadTitle(cleanMessage);
      thread = new Thread({
        threadId,
        title: smartTitle,
        messages: [{ role: "user", content: cleanMessage }],
      });
    } else {
      thread.messages.push({ role: "user", content: cleanMessage });
    }

    const assistantReply = await getOpenAIAPIResponse(thread.messages);

    thread.messages.push({ role: "assistant", content: assistantReply });
    thread.updatedAt = new Date();
    await thread.save();
    res.json({ reply: assistantReply });
  } catch (err) {
    console.log("Error processing chat message:", err);
    res.status(500).json({ error: "Failed to process chat message" });
  }
});

// Stream chat responses
router.post("/chat/stream", async (req, res) => {
  const { threadId, message } = req.body;
  const cleanMessage = typeof message === "string" ? message.trim() : "";

  if (!threadId || !cleanMessage) {
    return res
      .status(400)
      .json({ error: "Thread ID and non-empty message are required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let thread = await Thread.findOne({ threadId });
    if (!thread) {
      const smartTitle = await buildThreadTitle(cleanMessage);
      thread = new Thread({
        threadId,
        title: smartTitle,
        messages: [{ role: "user", content: cleanMessage }],
      });
    } else {
      thread.messages.push({ role: "user", content: cleanMessage });
    }

    const assistantReply = await streamOpenAIAPIResponse(thread.messages, (token) => {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    });

    const finalReply = assistantReply || FALLBACK_REPLY;

    thread.messages.push({ role: "assistant", content: finalReply });
    thread.updatedAt = new Date();
    await thread.save();

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.log("Error streaming chat message:", err);
    res.write(
      `data: ${JSON.stringify({ error: "Failed to stream chat message" })}\n\n`,
    );
    res.end();
  }
});

// Regenerate latest assistant reply for a thread
router.post("/chat/regenerate", async (req, res) => {
  const { threadId } = req.body;
  if (!threadId) {
    return res.status(400).json({ error: "Thread ID is required" });
  }

  try {
    const thread = await Thread.findOne({ threadId });
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    if (!thread.messages.length) {
      return res.status(400).json({ error: "No messages to regenerate" });
    }

    if (thread.messages[thread.messages.length - 1]?.role === "assistant") {
      thread.messages.pop();
    }

    const hasUserMessage = thread.messages.some((msg) => msg.role === "user");
    if (!hasUserMessage) {
      return res.status(400).json({ error: "No user prompt found to regenerate" });
    }

    const assistantReply = await getOpenAIAPIResponse(thread.messages);

    thread.messages.push({ role: "assistant", content: assistantReply });
    thread.updatedAt = new Date();
    await thread.save();

    res.json({ reply: assistantReply });
  } catch (err) {
    console.log("Error regenerating chat message:", err);
    res.status(500).json({ error: "Failed to regenerate chat message" });
  }
});

export default router;
