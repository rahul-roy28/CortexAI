import express from "express";
import Thread from "../models/Thread.js";
import getOpenAIAPIResponse from "../utils/openai.js";

const router = express.Router();

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

// Handle chat messages
router.post("/chat", async (req, res) => {
  const { threadId, message } = req.body;
  if (!threadId || !message) {
    return res
      .status(400)
      .json({ error: "Thread ID and message are required" });
  }
  try {
    let thread = await Thread.findOne({ threadId });
    if (!thread) {
      // 1️⃣ Generate smart AI title
      const titlePrompt = [
        {
          role: "user",
          content: `Generate a short 5-word title for this conversation: "${message}"`,
        },
      ];

      const smartTitleRaw = await getOpenAIAPIResponse(titlePrompt);

      const smartTitle = smartTitleRaw.replace(/^["']|["']$/g, "").trim();

      // If the thread doesn't exist, create a new one
      thread = new Thread({
        threadId,
        title: smartTitle,
        messages: [{ role: "user", content: message }],
      });
    } else {
      // If the thread exists, add the new message to it
      thread.messages.push({ role: "user", content: message });
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

export default router;
