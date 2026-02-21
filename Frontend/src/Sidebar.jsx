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
  } = useContext(MyContext);
  const getAllThreads = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/thread");
      const res = await response.json();
      const filteredData = res.map((thread) => ({
        threadId: thread.threadId,
        title: thread.title,
      }));
      setAllThreads(filteredData);
    } catch (error) {
      console.error("Error fetching threads:", error);
    }
  };
  useEffect(() => {
    getAllThreads();
  }, []);

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
  const deleteThread = async (threadId) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/thread/${threadId}`,
        {
          method: "DELETE",
        },
      );
      const res = await response.json();
      console.log(res);
      // Refresh the thread list after deletion
      setAllThreads((prev) =>
        prev.filter((thread) => thread.threadId !== threadId),
      );
      // If the deleted thread is the current thread, reset to a new chat
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
        {allThreads?.map((thread, idx) => (
          <li
            key={idx}
            onClick={(e) => changeThread(thread.threadId)}
            className={thread.threadId === currThreadId ? "highlighted" : " "}
          >
            {thread.title}
            <i
              className="fa-regular fa-trash-can"
              onClick={(e) => {
                e.stopPropagation();
                deleteThread(thread.threadId);
              }}
            ></i>
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
