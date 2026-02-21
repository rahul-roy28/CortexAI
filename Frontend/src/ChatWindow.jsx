import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useEffect, useRef, useState } from "react";
import { ScaleLoader } from "react-spinners";

function ChatWindow() {
  const {
    prompt,
    setPrompt,
    currThreadId,
    prevChats,
    setPrevChats,
    setNewChat,
    getAllThreads,
  } = useContext(MyContext);

  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const abortControllerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const inputEl = inputRef.current;
    if (!inputEl) return;

    inputEl.style.height = "auto";
    const maxHeight = 180;
    const nextHeight = Math.min(inputEl.scrollHeight, maxHeight);
    inputEl.style.height = `${nextHeight}px`;
    inputEl.style.overflowY =
      inputEl.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [prompt]);

  const appendStreamToken = (token) => {
    setPrevChats((prevChats) => {
      const next = [...prevChats];
      if (!next.length || next[next.length - 1].role !== "assistant") {
        return [...next, { role: "assistant", content: token }];
      }
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, content: `${last.content}${token}` };
      return next;
    });
  };

  const sendMessage = async () => {
    const trimmedPrompt = prompt.trim();
    if (loading || !trimmedPrompt) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setNewChat(false);

    setPrevChats((prevChats) => [
      ...prevChats,
      { role: "user", content: trimmedPrompt },
      { role: "assistant", content: "" },
    ]);

    setPrompt("");

    try {
      const response = await fetch("http://localhost:8080/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedPrompt,
          threadId: currThreadId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body)
        throw new Error("Failed to stream reply");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventBlock of events) {
          const lines = eventBlock
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("data:"));

          for (const line of lines) {
            const payload = line.replace(/^data:\s*/, "");
            if (!payload) continue;
            const parsed = JSON.parse(payload);
            if (parsed.token) appendStreamToken(parsed.token);
            if (parsed.error) throw new Error(parsed.error);
          }
        }
      }

      setPrevChats((prevChats) => {
        const next = [...prevChats];
        if (next.length && next[next.length - 1].role === "assistant") {
          const assistantContent = next[next.length - 1].content?.trim() || "";
          if (!assistantContent) {
            next[next.length - 1] = {
              role: "assistant",
              content:
                "Sorry, something went wrong while generating the response.",
            };
          }
        }
        return next;
      });

      await getAllThreads();
    } catch (error) {
      if (error?.name === "AbortError") {
        setPrevChats((prevChats) => {
          const next = [...prevChats];
          if (next.length && next[next.length - 1].role === "assistant") {
            const assistantContent =
              next[next.length - 1].content?.trim() || "";
            if (!assistantContent) next.pop();
          }
          return next;
        });
        return;
      }

      console.error("Error fetching streamed reply:", error);
      setPrevChats((prevChats) => {
        const next = [...prevChats];
        if (next.length && next[next.length - 1].role === "assistant") {
          next[next.length - 1] = {
            role: "assistant",
            content:
              "Sorry, something went wrong while generating the response.",
          };
          return next;
        }
        return [
          ...next,
          {
            role: "assistant",
            content:
              "Sorry, something went wrong while generating the response.",
          },
        ];
      });
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const regenerateReply = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8080/api/chat/regenerate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId: currThreadId }),
        },
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Failed to regenerate reply");
      }

      const res = await response.json();
      if (!res.reply) throw new Error("Missing regenerated reply");

      setPrevChats((prevChats) => {
        const next = [...prevChats];
        if (next.length && next[next.length - 1].role === "assistant") {
          next[next.length - 1] = { role: "assistant", content: res.reply };
          return next;
        }
        return [...next, { role: "assistant", content: res.reply }];
      });

      await getAllThreads();
    } catch (error) {
      console.error("Error regenerating reply:", error);
    } finally {
      setLoading(false);
    }
  };

  const canRegenerate =
    prevChats.some((chat) => chat.role === "user") &&
    prevChats.some((chat) => chat.role === "assistant");

  return (
    <div className="chatWindow">
      {/* ── Navbar ── */}
      <div className="navbar">
        <span className="icons">
          Cortex<span className="ai">AI</span>
          <i
            className="fa-solid fa-chevron-down"
            style={{ marginLeft: "6px", fontSize: "0.75rem", color: "#888" }}
          ></i>
        </span>
        <div className="headerActions">
          <div className="userIconDiv" onClick={() => setIsOpen(!isOpen)}>
            <span className="userIcon">
              <i
                className="fa-solid fa-user"
                style={{ fontSize: "0.8rem" }}
              ></i>
            </span>
          </div>
        </div>
      </div>

      {/* ── Dropdown ── */}
      {isOpen && (
        <div className="dropDown">
          <div className="dropDownItem">
            <i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan
          </div>
          <div className="dropDownItem">
            <i className="fa-solid fa-gear"></i> Settings
          </div>
          <div className="dropDownItem">
            <i className="fa-solid fa-arrow-right-from-bracket"></i> Log out
          </div>
        </div>
      )}

      {/* ── Chat messages ── */}
      <Chat
        onRegenerate={regenerateReply}
        canRegenerate={canRegenerate && !loading}
      />

      <ScaleLoader color="#00bfff" loading={loading} />

      {/* ── Input area ── */}
      <div className="chatInput">
        <div className="inputBox">
          {/* Row 1: Textarea */}
          <textarea
            ref={inputRef}
            placeholder="Ask anything..."
            value={prompt}
            disabled={loading}
            rows={1}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />

          {/* Row 2: Toolbar */}
          <div className="inputToolbar">
            {/* Left: attach + tool pills */}
            <div className="leftTools">
              <button
                type="button"
                className="inputIconBtn"
                title="Attach file"
                aria-label="Attach file"
              >
                <i className="fa-solid fa-paperclip"></i>
              </button>

              <button type="button" className="toolPillBtn" title="Web search">
                <i className="fa-solid fa-globe"></i>
                Search
              </button>

              <button type="button" className="toolPillBtn" title="Deep think">
                <i className="fa-solid fa-brain"></i>
                Reason
              </button>
            </div>

            {/* Right: status dot + mic + send/stop */}
            <div className="rightTools">
              <span className="statusDot" aria-hidden="true"></span>

              <button
                type="button"
                className="inputIconBtn"
                title="Voice input"
                aria-label="Voice input"
              >
                <i className="fa-solid fa-microphone"></i>
              </button>

              <button
                id="submit"
                type="button"
                onClick={loading ? stopGenerating : sendMessage}
                title={loading ? "Stop generating" : "Send message"}
                aria-label={loading ? "Stop generating" : "Send message"}
              >
                <i
                  className={
                    loading ? "fa-solid fa-stop" : "fa-solid fa-arrow-up"
                  }
                ></i>
              </button>
            </div>
          </div>
        </div>

        <p className="info">
          CortexAI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}

export default ChatWindow;
