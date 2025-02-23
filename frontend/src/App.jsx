import { useEffect, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import "./index.css"; // Ensure your custom styles are still included
import { toast, Toaster } from 'sonner';
import "./Loader.css"

const apiKey = import.meta.env.VITE_API_KEY;
const WS_SERVER = "https://codeeditor-live.onrender.com/";
let ws;
const languageMapping = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
};

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (joined) {
      ws = new WebSocket(WS_SERVER);

      ws.onopen = () => {
        console.log("Connected to WebSocket server");
        ws.send(JSON.stringify({ type: "join", roomId, userName }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "userJoined":
            setUsers(data.users);
            break;
          case "codeUpdate":
            setCode(data.code);
            break;
          case "userTyping":
            setTyping(`${data.user.slice(0, 8)}... is Typing`);
            setTimeout(() => setTyping(""), 2000);
            break;
          case "languageUpdate":
            setLanguage(data.language);
            break;
          case "outputUpdate":
            setOutput(data.output);
            break;
          case "inputUpdate":
            setInput(data.input);
            break;
          default:
            break;
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
      };

      return () => {
        ws.close();
      };  
    }
  }, [joined]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (ws) {
        ws.send(JSON.stringify({ type: "leaveRoom", roomId }));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const joinRoom = () => {
    setLoading(true);
    if(roomId == ""){
      toast.error("Room ID cannot be empty");
    }
    else if(!/^[0-9]+$/.test(roomId)){
      toast.error("Room ID must contains numerals only");
    }
    else if(userName == ""){
      toast.error("Username cannot be empty");
    }
    else if(!/^[A-Za-z\s]+$/.test(userName)){
      toast.error("Username must contains alphabet only");
    }
    else if (roomId && userName) {
      setJoined(true);
    }
    setLoading(false);
  };

  const leaveRoom = () => {
    setLoading(true);
    if (ws) {
      ws.send(JSON.stringify({ type: "leaveRoom", roomId }));
      ws.close();
    }
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// start code here");
    setLanguage("javascript");
    setInput("");
    setLoading(false);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const handleRun = async () => {
    setLoading(true);

    const languageId = languageMapping[language];

    const options = {
      method: "POST",
      url: "https://judge0-ce.p.rapidapi.com/submissions",
      params: { base64_encoded: "false", wait: "true" },
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        "X-RapidAPI-Key": apiKey,
      },
      data: {
        source_code: code,
        language_id: languageId,
        stdin: input,
      },
    };

    try {
      if(code == ""){
        toast.error("Source code cannot be empty");
        return;
      }
      const response = await axios.request(options);
      if (ws) {
        ws.send(JSON.stringify({ type: "outputChange", roomId, output: response.data.stdout }));
      }
      if(response.data.stdout == null){
        toast.error("Check syntax / Language selected")
        setOutput("Check syntax / Language selected")
      }
      else setOutput(response.data.stdout || response.data.stderr || "No output");
    } catch (error) {
      console.error(error);
      setOutput("Error executing code. Check your API key and network connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (ws) {
      ws.send(JSON.stringify({ type: "codeChange", roomId, code: newCode }));
      //ws.send(JSON.stringify({ type: "typing", roomId, userName }));
    }
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    if (ws) {
      ws.send(JSON.stringify({ type: "languageChange", roomId, language: newLanguage }));
    }
  };

  const handleInputChange = (e) => {
    const newInput = e.target.value;
    setInput(newInput);
    if(ws){
      ws.send(JSON.stringify({type: "inputChange", roomId, input: newInput}))
    }
  }

  if (!joined) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <Toaster />
        <div className="bg-white p-8 rounded-xl shadow-lg w-96">
          <h1 className="text-2xl font-bold text-center mb-6">Enter Code</h1>
          <input
            type="text"
            placeholder="Room Id"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4"
          />
          <input
            type="text"
            placeholder="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4"
          />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm">
              <div className="loader">
                <div className="inner one"></div>
                <div className="inner two"></div>
                <div className="inner three"></div>
              </div>
            </div>
          )}

          <button
            onClick={joinRoom}
            className="w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
    <Toaster />
      <div className="w-1/4 bg-white p-4 shadow-lg">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold">Code Room: {roomId}</h2>
          <button
            onClick={copyRoomId}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Copy Id
          </button>
          {copySuccess && <span className="text-green-500">{copySuccess}</span>}
        </div>

        <h3 className="text-lg mb-2">Collaborators:</h3>
        <ul className="mb-4">
          {users.map((user, index) => (
            <li key={index} className="text-sm">{user.slice(0, 8)}...</li>
          ))}
        </ul>

        <select
          className="w-full p-2 border border-gray-300 rounded-md mb-6"
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
        </select>

        <button
          className="w-full p-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          onClick={leaveRoom}
        >
          Quit
        </button>
      </div>

      <div className="flex-1 p-4">
        <Editor
          height="70vh"
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
          }}
        />

      <textarea
        value={input}
        onChange={handleInputChange}
        rows="4"
        placeholder="Provide input..."
        style={{ width: "100%", padding: "10px", marginTop: "10px" }}
      />

        <button
          onClick={handleRun}
          disabled={loading}
          className="w-full mt-4 p-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          {loading ? 
            <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm">
              <div className="loader">
                <div className="inner one"></div>
                <div className="inner two"></div>
                <div className="inner three"></div>
              </div>
            </div>
              : "Run Code"}
        </button>

        <div className="mt-6 bg-gray-800 p-4 text-white rounded-md">
          <h2 className="text-lg">Output:</h2>
          <pre className="whitespace-pre-wrap break-words">{output}</pre>
        </div>
      </div>
    </div>
  );
};

export default App;