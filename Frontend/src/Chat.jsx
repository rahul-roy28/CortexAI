import "./Chat.css";
import { useContext, useRef, useEffect, useState, useCallback } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

// Recursively extract plain text from React children (handles syntax-highlighted spans)
function extractText(children) {
  if (!children) return "";
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (typeof children === "object" && children.props) {
    return extractText(children.props.children);
  }
  return "";
}

// Renders a code block with a copy button in the top-right corner
function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const codeText = extractText(children).replace(/\n$/, "");

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="codeBlockWrapper">
      <button
        className="codeBlockCopyBtn"
        onClick={copyCode}
        title={copied ? "Copied!" : "Copy code"}
        aria-label={copied ? "Copied!" : "Copy code"}
      >
        <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"}></i>
        {copied ? " Copied!" : " Copy"}
      </button>
      <code className={className}>{children}</code>
    </div>
  );
}

function Chat({ onRegenerate, canRegenerate, loading }) {
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

  const isStreaming = (idx) => loading && idx === lastAssistantIndex;

  // Custom renderer: only use CodeBlock for fenced code blocks (inside <pre>)
  // Inline code like `Graph` has no language className and its parent is not <pre>
  const markdownComponents = {
    code({ node, className, children, ...props }) {
      const isBlock =
        node?.position?.start.line !== node?.position?.end.line ||
        className?.startsWith("language-");
      if (!isBlock) {
        // Inline code — render normally, no copy button
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
      // Block code — render with copy button
      return <CodeBlock className={className}>{children}</CodeBlock>;
    },
  };

  return (
    <>
      {newChat && <h1>What's on your mind?</h1>}
      <div className="chats" ref={chatContainerRef}>
        {prevChats?.map((chat, idx) => (
          <div
            className={chat.role === "user" ? "userDiv" : "gptDiv"}
            key={idx}
          >
            {chat.role === "user" ? (
              <p className="userMessage">{chat.content}</p>
            ) : (
              <div className="assistantWrap">
                <div className="gptMessage">
                  <ReactMarkdown
                    rehypePlugins={[rehypeHighlight]}
                    components={markdownComponents}
                  >
                    {String(chat.content || "")}
                  </ReactMarkdown>
                </div>
                {!isStreaming(idx) && chat.content?.trim() && (
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
                          copiedIndex === idx
                            ? "fa-solid fa-check"
                            : "fa-regular fa-copy"
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
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default Chat;
