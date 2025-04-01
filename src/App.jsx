/* App.jsx */

import React, { useState, useEffect, useRef } from 'react'
import { query } from './services/openai/query.jsx'
import { RetrieveRooms } from './services/firebase/rooms/RetrieveRooms.js'
import './App.css'

function App() {
  const [dialogues, setDialogues] = useState([]);
  const [allRooms, setAllRooms] = useState({});
  const [API_KEY, SET_API_KEY] = useState(localStorage.getItem("API_KEY") || "");
  const setNewApiKeyHandler = (newKey) => {
    SET_API_KEY(newKey);
    localStorage.setItem("API_KEY", newKey);
  };
  const dialoguesEndRef = useRef(null);

  const setResponseSafely = (response) => {
    if (typeof response === 'object' && response.text && Array.isArray(response.options)) {
      // GPT에서 label + fullText로 응답한 경우
      setDialogues(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          bot: response.text,
          options: response.options
        };
        return updated;
      });
    } else {
      // 그냥 텍스트일 경우
      setDialogues(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          bot: typeof response === 'string' ? response.replace(/\\n/g, '\n') : response,
          options: []
        };
        return updated;
      });
    }
  };  

  const handleSendMessage = () => {
    const textarea = document.querySelector(".UserInput");
    const input = textarea.value.trim();
  
    if (!API_KEY) {
      alert("Please set your API Key first!");
      return;
    }
    if (input === "") {
      alert("Please enter a message first!");
      return;
    }
  
    textarea.value = "";
    const newDialogues = [...dialogues, { user: input, bot: "Loading..." }];
    setDialogues(prev => [...prev, { user: input, bot: "Loading..." }]);
  
    query({
      apiKey: API_KEY,
      dialogues: newDialogues,
      input,
      allRooms,
      setResponse: (response) => {
        setResponseSafely(response);
      }      
    });
  };  

  useEffect(() => {
    RetrieveRooms(setAllRooms);
  },[]);

  useEffect(() => {
    if (dialoguesEndRef.current) {
      dialoguesEndRef.current.scrollTop = dialoguesEndRef.current.scrollHeight;
    }
    if (dialogues.length === 0) {
      const input = "안녕 KIRA, 예약 도움말을 보여줄 수 있을까?";
      const newDialogues = [{ user: input, bot: "Loading..." }];
      setDialogues(newDialogues);
  
      query({
        apiKey: API_KEY,
        dialogues: newDialogues,
        input,
        allRooms,
        setResponse: (response) => {
          setResponseSafely(response);
        }
      });
    }
  }, [API_KEY, allRooms, dialogues.length]);
  
  return (
    <div className="App">
      <div className="sakura-container">
        {[...Array(20)].map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 10;
          const duration = 5 + Math.random() * 5;
          const size = 20 + Math.random() * 20;
          const initialRotate = Math.floor(Math.random() * 360); // 초기 회전값 (0~359도)
          const rotateAmount = 360 + Math.floor(Math.random() * 360); // 추가 회전량 (360~719도)
          const fallTranslateX = (Math.random() * 40 - 20).toFixed(2); // -20vw ~ 20vw 사이의 수평 이동

          return (
            <div
              key={i}
              className="sakura"
              style={{
                left: `${left}vw`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                width: `${size}px`,
                height: `${size}px`,
                '--initial-rotate': `${initialRotate}deg`,
                '--rotate-amount': `${rotateAmount}deg`,
                '--fall-translateX': `${fallTranslateX}vw`,
              }}
            />
          );
        })}
      </div>
      <header className="App-header">
        <h4>KAIST ID Reservation Assistant, KIRA</h4>
        <div className="apiKey">
          <label onClick={() => {
            let newKey = prompt("Your Current Key is "+API_KEY+"\n\nEnter your API Key here");
            if (newKey != null) {
              setNewApiKeyHandler(newKey);
              SET_API_KEY(newKey);
            }
          }}>API</label>
        </div>
      </header>
      <div className="App-body">
        <div className="Dialogues" ref={dialoguesEndRef}>
          {dialogues.map((dialogue, index) => (
            <div key={index} className="Dialogue">
              <div className="UserDialogue">
                <div className="UserMessage">
                  {dialogue.user}
                </div>
              </div>
              <div className="BotDialogue">
                <div className="BotMessage">
                  {dialogue.bot}
                  {dialogue.options && dialogue.options.length > 0 && (
                    <div className="OptionButtons">
                      {dialogue.options.map((option, idx) => (
                        <button key={idx} className="OptionButton" onClick={() => {
                          const textarea = document.querySelector(".UserInput");
                          textarea.value = option.fullText;
                          handleSendMessage();
                        }}>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bottomUI">
        <textarea
          className="UserInput"
          placeholder="Type your message here..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        ></textarea>
        <button className="SendButton" onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    </div>
  )
}

export default App
