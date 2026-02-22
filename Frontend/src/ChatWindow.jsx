import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import AuthModal from "./AuthModal.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useEffect, useRef, useState } from "react";
import { ScaleLoader } from "react-spinners";
import BASE_URL from "./config.js";

function ChatWindow() {
  const {
    prompt,
    setPrompt,
    currThreadId,
    prevChats,
    setPrevChats,
    setNewChat,
    getAllThreads,
    // Auth
    token,
    user,
    logout,
    openAuthModal,
    showAuthModal,
    handleAuthSuccess,
  } = useContext(MyContext);

  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const abortControllerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside (but not when clicking inside the dropdown itself)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isOpen &&
        !e.target.closest(".headerActions") &&
        !e.target.closest(".dropDown")
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
    // If user is not logged in, show auth modal instead
    if (!token) {
      openAuthModal();
      return;
    }

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
      const response = await fetch(`${BASE_URL}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    if (loading || !token) return;
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/chat/regenerate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ threadId: currThreadId }),
      });

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

  // Get initials from full name for avatar
  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  };

  return (
    <div className="chatWindow">
      {/* Auth Modal */}
      {showAuthModal && <AuthModal onAuthSuccess={handleAuthSuccess} />}

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
          {user ? (
            /* Logged in: show avatar with initials */
            <div className="userIconDiv" onClick={() => setIsOpen(!isOpen)}>
              <span className="userIcon userIconInitials" title={user.fullName}>
                {getInitials(user.fullName)}
              </span>
            </div>
          ) : (
            /* Not logged in: show plain user icon */
            <div
              className="userIconDiv"
              onClick={openAuthModal}
              title="Sign in"
            >
              <span className="userIcon">
                <i
                  className="fa-solid fa-user"
                  style={{ fontSize: "0.8rem" }}
                ></i>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Dropdown (only when logged in) ── */}
      {isOpen && user && (
        <div className="dropDown">
          {/* User info at top */}
          <div className="dropDownUser">
            <span className="dropDownName">{user.fullName}</span>
            <span className="dropDownEmail">{user.email}</span>
          </div>
          <div className="dropDownDivider" />
          <div className="dropDownItem">
            <i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan
          </div>
          <div className="dropDownItem">
            <i className="fa-solid fa-gear"></i> Settings
          </div>
          <div
            className="dropDownItem dropDownLogout"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i> Log out
          </div>
        </div>
      )}

      {/* ── Chat messages ── */}
      <Chat
        onRegenerate={regenerateReply}
        canRegenerate={canRegenerate && !loading}
        loading={loading}
      />

      <ScaleLoader color="#00bfff" loading={loading} />

      {/* ── Input area ── */}
      <div className="chatInput">
        <div
          className="inputBox"
          onClick={() => {
            if (!token) openAuthModal();
          }}
        >
          {/* Row 1: Textarea */}
          <textarea
            ref={inputRef}
            placeholder={
              token ? "Ask anything..." : "Sign in to start chatting..."
            }
            value={prompt}
            disabled={loading || !token}
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
            <div className="leftTools">
              <button
                type="button"
                className="inputIconBtn"
                title="Attach file"
                aria-label="Attach file"
                disabled={!token}
              >
                <i className="fa-solid fa-paperclip"></i>
              </button>
              <button
                type="button"
                className="toolPillBtn"
                title="Web search"
                disabled={!token}
              >
                <i className="fa-solid fa-globe"></i> Search
              </button>
              <button
                type="button"
                className="toolPillBtn"
                title="Deep think"
                disabled={!token}
              >
                <i className="fa-solid fa-brain"></i> Reason
              </button>
            </div>

            <div className="rightTools">
              <span className="statusDot" aria-hidden="true"></span>
              <button
                type="button"
                className="inputIconBtn"
                title="Voice input"
                aria-label="Voice input"
                disabled={!token}
              >
                <i className="fa-solid fa-microphone"></i>
              </button>
              <button
                id="submit"
                type="button"
                onClick={loading ? stopGenerating : sendMessage}
                title={
                  loading
                    ? "Stop generating"
                    : token
                      ? "Send message"
                      : "Sign in to chat"
                }
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
