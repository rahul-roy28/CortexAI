import "./App.css";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { MyContext } from "./MyContext.jsx";
import { useState, useEffect } from "react";
import { v1 as uuidv1 } from "uuid";

function App() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]);
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);
  const getAllThreads = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/thread");
      const res = await response.json();

      const formatted = res.map((thread) => ({
        threadId: thread.threadId,
        title: thread.title,
      }));

      setAllThreads(formatted);
    } catch (error) {
      console.error("Error fetching threads:", error);
    }
  };
  useEffect(() => {
    getAllThreads();
  }, []);

  const providerValues = {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    setCurrThreadId,
    prevChats,
    setPrevChats,
    newChat,
    setNewChat,
    allThreads,
    setAllThreads,
    getAllThreads,
  }; // Define the value you want to provide to the context
  return (
    <div className="app">
      <MyContext.Provider value={providerValues}>
        <Sidebar></Sidebar>
        <ChatWindow></ChatWindow>
      </MyContext.Provider>
    </div>
  );
}

export default App;
