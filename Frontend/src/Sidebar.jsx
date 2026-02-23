import "./Sidebar.css";
import { useContext, useEffect } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";
import BASE_URL from "./config.js";
import logo from "./assets/cortexai_logo.png";

function Sidebar() {
  const {
    allThreads,
    setAllThreads,
    currThreadId,
    setNewChat,
    setPrompt,
    setReply,
    setCurrThreadId,
    setPrevChats,
    getAllThreads,
    token,
  } = useContext(MyContext);

  useEffect(() => {
    if (token) getAllThreads();
  }, [getAllThreads, token]);

  const createNewChat = () => {
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
  };

  const changeThread = async (newThreadId) => {
    if (!token) return;
    setCurrThreadId(newThreadId);
    try {
      const response = await fetch(`${BASE_URL}/api/thread/${newThreadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await response.json();
      setPrevChats(res);
      setNewChat(false);
      setReply(null);
    } catch (error) {
      console.error("Error fetching thread messages:", error);
    }
  };

  const renameThread = async (threadId, currentTitle) => {
    if (!token) return;
    const nextTitle = window.prompt("Rename chat", currentTitle || "");
    if (nextTitle === null) return;

    const cleanTitle = nextTitle.trim();
    if (!cleanTitle || cleanTitle === currentTitle) return;

    try {
      const response = await fetch(`${BASE_URL}/api/thread/${threadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: cleanTitle }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Failed to rename thread");
      }

      setAllThreads((prev) =>
        prev.map((thread) =>
          thread.threadId === threadId
            ? { ...thread, title: cleanTitle }
            : thread,
        ),
      );
    } catch (error) {
      console.error("Error renaming thread:", error);
    }
  };

  const deleteThread = async (threadId) => {
    if (!token) return;
    try {
      const response = await fetch(`${BASE_URL}/api/thread/${threadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await response.json();
      console.log(res);
      setAllThreads((prev) =>
        prev.filter((thread) => thread.threadId !== threadId),
      );
      if (currThreadId === threadId) createNewChat();
    } catch (error) {
      console.error("Error deleting thread:", error);
    }
  };

  return (
    <section className="sidebar">
      <button onClick={createNewChat}>
        <img src={logo} alt="CortexAI logo" className="logo" />
        <span>
          <i className="fa-regular fa-pen-to-square"></i>
        </span>
      </button>

      <ul className="history">
        {token ? (
          allThreads?.map((thread) => (
            <li
              key={thread.threadId}
              onClick={() => changeThread(thread.threadId)}
              className={thread.threadId === currThreadId ? "highlighted" : " "}
            >
              <span className="threadTitle">{thread.title}</span>
              <span className="threadActions">
                <i
                  className="fa-regular fa-pen-to-square"
                  onClick={(e) => {
                    e.stopPropagation();
                    renameThread(thread.threadId, thread.title);
                  }}
                ></i>
                <i
                  className="fa-regular fa-trash-can"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteThread(thread.threadId);
                  }}
                ></i>
              </span>
            </li>
          ))
        ) : (
          <li className="sidebarSignInHint">
            <i className="fa-solid fa-lock" style={{ fontSize: "0.8rem" }}></i>
            Sign in to see your chats
          </li>
        )}
      </ul>

      <div className="sign">
        <p>By RahulRoy &hearts;</p>
      </div>
    </section>
  );
}

export default Sidebar;
