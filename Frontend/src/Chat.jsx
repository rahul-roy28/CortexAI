import "./Chat.css";
import { useContext, useState, useEffect, useRef } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css"; // You can choose any highlight.js theme you like

// react-markdown : Use this library to render markdown content in the chat messages. It allows you to display formatted text, links, images, and more in the chat interface. You can install it using npm or yarn and then use it to render the content of the chat messages.

// rehype-highlight : This library can be used in conjunction with react-markdown to add syntax highlighting to code blocks in the chat messages. It supports a wide range of programming languages and can enhance the readability of code snippets shared in the chat.

function Chat() {
  const { newChat, prevChats, reply } = useContext(MyContext);
  const [latestReply, setLatestReply] = useState(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [latestReply, prevChats]);

  useEffect(() => {
    if (reply === null) {
      setLatestReply(null);
      return;
    }
    // latest Reply separate =>typing effect create
    if (!prevChats?.length) return;
    const content = reply.split(" ");
    let index = 0;
    const intervalId = setInterval(() => {
      setLatestReply(content.slice(0, index + 1).join(" "));
      index++;
      if (index >= content.length) {
        clearInterval(intervalId);
      }
    }, 40);
    return () => clearInterval(intervalId);
  }, [prevChats, reply]);
  return (
    <>
      {newChat && <h1>What’s on your mind?</h1>}
      <div className="chats" ref={chatContainerRef}>
        {prevChats?.slice(0, -1).map((chat, idx) => (
          <div
            className={chat.role === "user" ? "userDiv" : "gptDiv"}
            key={idx}
          >
            {chat.role === "user" ? (
              <p className="userMessage">{chat.content}</p>
            ) : (
              <div className="gptMessage">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                  {String(chat.content || "")}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}

        {prevChats.length > 0 && (
          <>
            {latestReply === null ? (
              <div className="gptDiv" ey={"non-typing"}>
                <div className="gptMessage">
                  <div className="gptMessage">
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                      {String(prevChats[prevChats.length - 1].content || "")}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="gptDiv" ey={"typing"}>
                <div className="gptMessage">
                  <div className="gptMessage">
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                      {String(latestReply || "")}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
export default Chat;
