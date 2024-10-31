import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Trash2 } from 'lucide-react';
import './index.css';

const SplitScreenApp = () => {
  const [messages, setMessages] = useState([
    { type: 'ai', text: "Hello! I'm Scotty, your AI trading assistant. How can I help you today?" }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef(null);
  const [code, setCode] = useState(`function exampleFunction() {\n  // Write your code here\n  console.log("Hello, World!");\n  return true;\n}`);
  const [language, setLanguage] = useState('javascript');

  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return;
    const newMessages = [...messages, { type: 'user', text: inputMessage }, { type: 'ai', text: `I appreciate your message. Here's a response to: "${inputMessage}"` }];
    setMessages(newMessages);
    setInputMessage('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCodeChange = (e) => {
    setCode(e.target.value);
  };

  const handleTabKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      
      
      setCode(code.substring(0, start) + "    " + code.substring(end));
      
      
      e.target.selectionStart = e.target.selectionEnd = start + 4;
    }
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const clearCode = () => {
    setCode(`function exampleFunction() {\n  // Write your code here\n  console.log("Hello, World!");\n  return true;\n}`);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Side: Chatbox, 50% */}
      <div className="w-1/2 bg-gray-700 flex flex-col border-r border-gray-700 rounded-lg m-2">
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start ${msg.type === 'user' ? 'justify-end' : ''}`}>
              {msg.type === 'ai' && (
                <img 
                  src="avatar.png"
                  alt="Bot Avatar" 
                  className="w-8 h-8 rounded-full mr-2"  
                />
              )}
              <div className={`p-3 rounded-lg max-w-[80%] ${msg.type === 'user' ? 'bg-blue-800 text-white' : 'bg-gray-800 text-gray-200'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="p-4 bg-gray-800 border-t border-gray-600 flex rounded-b-lg">
          <input 
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Send a message..."
            className="flex-grow p-2 border border-gray-600 rounded-l-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleSendMessage}
            className="bg-blue-700 text-white p-2 rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Right Side: Code Editor, 50% */}
      <div className="w-1/2 bg-gray-700 flex flex-col rounded-lg m-2">
        <div className="p-2 bg-gray-700 flex justify-between items-center border-b border-gray-600 rounded-t-lg">
          <select 
            value={language}
            onChange={handleLanguageChange}
            className="p-1 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
            <option value="html">HTML</option>
          </select>
          <div className="flex space-x-2">
            <button onClick={copyCode} className="hover:bg-gray-700 p-1 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <Copy size={20} />
            </button>
            <button onClick={clearCode} className="hover:bg-gray-700 p-1 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <Trash2 size={20} />
            </button>
          </div>
        </div>
        <div className="flex-grow overflow-auto bg-gray-700 p-4 rounded-b-lg">
          <textarea 
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleTabKey}
            className="w-full h-full bg-gray-700 text-white font-mono text-sm border border-gray-700 focus:outline-none resize-none p-5"
          />
        </div>
      </div>
    </div>
  );
};

export default SplitScreenApp;


