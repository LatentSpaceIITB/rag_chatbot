import React from "react"
import { useState } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import HomePage from "./components/HomePage"
import PDFViewer from "./components/PDFViewer"
import ChatInterface from "./components/ChatInterface"
// import Signup from "./pages/Signup"
import SignIn from "./pages/Signup"
import Register from "./pages/Register"
import { YouTubeViewer } from "./pages/YouTubeViewer"
// import SignupPage from "./components/SignupPage" // You'll need to create this component

export default function App() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState("")

  const handleSendMessage = (message) => {
    setMessages((prev) => [...prev, { role: "user", content: message }])
    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I understand you're asking about: "${message}". Based on the document content, here's what I can help you with...`,
        },
      ])
    }, 1000)
  }

  const handleTextSelection = (selectedText) => {
    setInputText(selectedText)
  }

  if (uploadedFile) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex h-screen">
          <div className="flex-1 w-2/3">
            <PDFViewer file={uploadedFile} onClose={() => setUploadedFile(null)} onTextSelect={handleTextSelection} />
          </div>
          <div className="w-1/3 border-l border-gray-200">
            <ChatInterface
              messages={messages}
              inputText={inputText}
              setInputText={setInputText}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage onFileUpload={setUploadedFile} />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="/youtubeshow" element={<YouTubeViewer />} />
        {/* {uploadedFile && <Route path="/document" element={<PDFViewer />} />} */}
      </Routes>
    </Router>
  )
}