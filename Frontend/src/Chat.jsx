import "./Chat.css";
import { useContext, useRef, useEffect, useState } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

function Chat({ onRegenerate, canRegenerate }) {
  const { newChat, prevChats } = useContext(MyContext);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatContainerRef = useRef(null);
  const lastAssistantIndex = [...prevChats]
    .map((chat, idx) => ({ role: chat.role, idx }))
    .filter((chat) => chat.role === "assistant")
    .map((chat) => chat.idx)
    .pop();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [prevChats]);

  const copyMessage = async (content, idx) => {
    try {
      await navigator.clipboard.writeText(content || "");
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1200);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  return (
    <>
      {newChat && <h1>What’s on your mind?</h1>}
      <div className="chats" ref={chatContainerRef}>
        {prevChats?.map((chat, idx) => (
          <div className={chat.role === "user" ? "userDiv" : "gptDiv"} key={idx}>
            {chat.role === "user" ? (
              <p className="userMessage">{chat.content}</p>
            ) : (
              <div className="assistantWrap">
                <div className="gptMessage">
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                    {String(chat.content || "")}
                  </ReactMarkdown>
                </div>
                <div className="assistantActions">
                  <button
                    type="button"
                    className="copyBtn"
                    onClick={() => copyMessage(chat.content, idx)}
                    title={copiedIndex === idx ? "Copied" : "Copy"}
                    aria-label={copiedIndex === idx ? "Copied" : "Copy"}
                  >
                    <i
                      className={
                        copiedIndex === idx ? "fa-solid fa-check" : "fa-regular fa-copy"
                      }
                    ></i>
                  </button>
                  {canRegenerate && idx === lastAssistantIndex && (
                    <button
                      type="button"
                      className="copyBtn"
                      onClick={onRegenerate}
                      title="Regenerate"
                      aria-label="Regenerate"
                    >
                      <i className="fa-solid fa-rotate-right"></i>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default Chat;
