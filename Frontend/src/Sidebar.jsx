import "./Sidebar.css";
import { useContext, useEffect } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";

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
  } = useContext(MyContext);

  useEffect(() => {
    getAllThreads();
  }, [getAllThreads]);

  const createNewChat = () => {
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
  };

  const changeThread = async (newThreadId) => {
    setCurrThreadId(newThreadId);
    try {
      const response = await fetch(
        `http://localhost:8080/api/thread/${newThreadId}`,
      );
      const res = await response.json();
      setPrevChats(res);
      setNewChat(false);
      setReply(null);
    } catch (error) {
      console.error("Error fetching thread messages:", error);
    }
  };

  const renameThread = async (threadId, currentTitle) => {
    const nextTitle = window.prompt("Rename chat", currentTitle || "");
    if (nextTitle === null) return;

    const cleanTitle = nextTitle.trim();
    if (!cleanTitle || cleanTitle === currentTitle) return;

    try {
      const response = await fetch(`http://localhost:8080/api/thread/${threadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: cleanTitle }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Failed to rename thread");
      }

      setAllThreads((prev) =>
        prev.map((thread) =>
          thread.threadId === threadId ? { ...thread, title: cleanTitle } : thread,
        ),
      );
    } catch (error) {
      console.error("Error renaming thread:", error);
    }
  };

  const deleteThread = async (threadId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/thread/${threadId}`, {
        method: "DELETE",
      });
      const res = await response.json();
      console.log(res);
      setAllThreads((prev) => prev.filter((thread) => thread.threadId !== threadId));

      if (currThreadId === threadId) {
        createNewChat();
      }
    } catch (error) {
      console.error("Error deleting thread:", error);
    }
  };

  return (
    <section className="sidebar">
      <button onClick={createNewChat}>
        <img
          src="src/assets/cortexai_logo.png"
          alt="CortexAI logo"
          className="logo"
        />
        <span>
          <i className="fa-regular fa-pen-to-square"></i>
        </span>
      </button>
      <ul className="history">
        {allThreads?.map((thread) => (
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
        ))}
      </ul>
      <div className="sign">
        <p>By RahulRoy &hearts;</p>
      </div>
    </section>
  );
}

export default Sidebar;
