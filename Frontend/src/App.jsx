import "./App.css";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { MyContext } from "./MyContext.jsx";
import { useState, useCallback, useRef } from "react";
import { v1 as uuidv1 } from "uuid";

function App() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]);
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);

  // ── Auth state ──
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null,
  );
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  // tokenRef lets callbacks always read the freshest token
  // without needing to be re-created every time token changes
  const tokenRef = useRef(token);
  const updateToken = (t) => {
    tokenRef.current = t;
    setToken(t);
  };

  // ── Logout ──
  const logout = useCallback(async () => {
    try {
      await fetch("http://localhost:8080/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors on logout
    }
    // 1. Remove token from browser
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // 2. Clear all state — user is now unauthenticated
    tokenRef.current = null;
    updateToken(null);
    setUser(null);
    setAllThreads([]);
    setPrevChats([]);
    setCurrThreadId(uuidv1());
    setNewChat(true);
    // 3. Modal will now show if they try to chat (no redirect needed in SPA)
  }, []);

  // ── Fetch all threads for the logged-in user ──
  const getAllThreads = useCallback(
    async (tkn) => {
      const activeToken = tkn || tokenRef.current;
      if (!activeToken) return;
      try {
        const response = await fetch("http://localhost:8080/api/thread", {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (response.status === 401) {
          // Token expired — log out silently
          logout();
          return;
        }
        const res = await response.json();
        setAllThreads(
          res.map((thread) => ({
            threadId: thread.threadId,
            title: thread.title,
          })),
        );
      } catch (error) {
        console.error("Error fetching threads:", error);
      }
    },
    [logout],
  );

  // ── Called by AuthModal after successful signup/login ──
  const handleAuthSuccess = useCallback(
    (newToken, newUser) => {
      updateToken(newToken);
      setUser(newUser);
      setShowAuthModal(false);
      getAllThreads(newToken);
    },
    [getAllThreads],
  );

  const openAuthModal = useCallback(() => setShowAuthModal(true), []);

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
    // Auth
    token,
    user,
    logout,
    openAuthModal,
    showAuthModal,
    setShowAuthModal,
    handleAuthSuccess,
  };

  return (
    <div className="app">
      <MyContext.Provider value={providerValues}>
        <Sidebar />
        <ChatWindow />
      </MyContext.Provider>
    </div>
  );
}

export default App;
