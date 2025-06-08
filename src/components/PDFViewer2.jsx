import React from "react"
import { useState, useEffect, useRef } from "react"
import {
    ChevronLeft,
    Search,
    Sun,
    Download,
    Share,
    RotateCw,
    MessageCircle,
    CreditCard,
    HelpCircle,
    FileText,
    ZoomIn,
    ZoomOut,
    Send,
    Loader2,
    X,
} from "lucide-react"
import { Button } from "./Button"
import * as pdfjsLib from "pdfjs-dist"
import "pdfjs-dist/build/pdf.worker.entry"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

// Initialize Gemini AI (you'll need to set your API key)
const GEMINI_API_KEY = "AIzaSyCKTpS31ZMeWwviDyD3lSLVI56jAp6wfNo" // Replace with your actual API key
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

function SelectionPopup({ position, onAction, onClose }) {
    const actions = [
        { id: "chat", label: "Chat", icon: MessageCircle },
        { id: "explain", label: "Explain", icon: HelpCircle },
        { id: "quiz", label: "Quiz", icon: FileText },
        { id: "flashcards", label: "Flashcards", icon: CreditCard },
    ]

    return (
        <div
            className="absolute z-50 bg-white rounded-lg shadow-lg p-2 flex gap-2 border border-gray-200"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: "translateX(-50%)",
            }}
        >
            {actions.map((action) => (
                <Button
                    key={action.id}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 text-sm hover:bg-gray-100"
                    onClick={() => onAction(action.id)}
                >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                </Button>
            ))}
        </div>
    )
}

function ChatPanel({ 
    isVisible, 
    onClose, 
    messages, 
    onSendMessage, 
    isLoading, 
    currentQuestion, 
    setCurrentQuestion 
}) {
    const messagesEndRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    if (!isVisible) return null

    return (
        <div className="fixed right-4 top-4 bottom-4 w-96 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col z-40">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="font-semibold">AI Assistant</h3>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-8">
                        Ask me anything about this PDF!
                    </div>
                )}
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                                message.type === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                            <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={currentQuestion}
                        onChange={(e) => setCurrentQuestion(e.target.value)}
                        placeholder="Ask about this PDF..."
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !isLoading && currentQuestion.trim()) {
                                onSendMessage(currentQuestion.trim())
                                setCurrentQuestion('')
                            }
                        }}
                        disabled={isLoading}
                    />
                    <Button
                        onClick={() => {
                            if (currentQuestion.trim()) {
                                onSendMessage(currentQuestion.trim())
                                setCurrentQuestion('')
                            }
                        }}
                        disabled={isLoading || !currentQuestion.trim()}
                        size="sm"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function PDFViewer({ file, onClose, onTextSelect }) {
    const [pdfDoc, setPdfDoc] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [scale, setScale] = useState(1.2)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectionPosition, setSelectionPosition] = useState(null)
    const [selectedContent, setSelectedContent] = useState("")
    
    // Gemini API related state
    const [fileBase64, setFileBase64] = useState("")
    const [showChat, setShowChat] = useState(false)
    const [messages, setMessages] = useState([])
    const [isAILoading, setIsAILoading] = useState(false)
    const [currentQuestion, setCurrentQuestion] = useState("")

    const pdfContainerRef = useRef(null)
    const selectionPopupRef = useRef(null)
    const canvasRef = useRef(null)
    const textOverlayRef = useRef(null)
    const renderTaskRef = useRef(null)
    const currentPageRef = useRef(currentPage)

    useEffect(() => {
        currentPageRef.current = currentPage
    }, [currentPage])

    // Convert file to base64 for Gemini API
    const convertFileToBase64 = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                const arrayBuffer = reader.result
                const base64 = btoa(
                    new Uint8Array(arrayBuffer)
                        .reduce((data, byte) => data + String.fromCharCode(byte), '')
                )
                resolve(base64)
            }
            reader.onerror = reject
            reader.readAsArrayBuffer(file)
        })
    }

    // Call Gemini API
    const callGeminiAPI = async (prompt, selectedText = "") => {
        try {
            setIsAILoading(true)
            
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })
            
            let fullPrompt = prompt
            if (selectedText) {
                fullPrompt = `${prompt}\n\nContext from selected text: "${selectedText}"`
            }

            const contents = [
                { text: fullPrompt },
                {
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: fileBase64
                    }
                }
            ]

            const result = await model.generateContent(contents)
            const response = await result.response
            return response.text()
        } catch (error) {
            console.error("Error calling Gemini API:", error)
            throw new Error("Failed to get AI response. Please check your API key and try again.")
        } finally {
            setIsAILoading(false)
        }
    }

    // Handle AI actions
    const handleAIAction = async (action, selectedText = "") => {
        let prompt = ""
        
        switch (action) {
            case "chat":
                setShowChat(true)
                return
            case "explain":
                prompt = selectedText 
                    ? `Please explain this text from the document: "${selectedText}"`
                    : "Please explain the main concepts in this document"
                break
            case "quiz":
                prompt = selectedText
                    ? `Create a quiz based on this text: "${selectedText}"`
                    : "Create a quiz with 5 questions based on this document"
                break
            case "flashcards":
                prompt = selectedText
                    ? `Create flashcards based on this text: "${selectedText}"`
                    : "Create flashcards with key terms and concepts from this document"
                break
            default:
                return
        }

        try {
            const response = await callGeminiAPI(prompt, selectedText)
            
            // Add to messages
            setMessages(prev => [
                ...prev,
                { type: 'user', content: prompt },
                { type: 'ai', content: response }
            ])
            
            setShowChat(true)
        } catch (error) {
            alert(error.message)
        }
    }

    // Handle chat message
    const handleSendMessage = async (message) => {
        setMessages(prev => [...prev, { type: 'user', content: message }])
        
        try {
            const response = await callGeminiAPI(message)
            setMessages(prev => [...prev, { type: 'ai', content: response }])
        } catch (error) {
            setMessages(prev => [...prev, { type: 'ai', content: `Error: ${error.message}` }])
        }
    }

    useEffect(() => {
        if (!file) return

        const loadPDF = async () => {
            try {
                setIsLoading(true)
                setError(null)

                // Convert file to base64 for Gemini API
                const base64 = await convertFileToBase64(file)
                setFileBase64(base64)

                // Load PDF with pdf.js
                const arrayBuffer = await file.arrayBuffer()
                const loadingTask = pdfjsLib.getDocument(arrayBuffer)
                const pdfDocument = await loadingTask.promise

                setPdfDoc(pdfDocument)
                setTotalPages(pdfDocument.numPages)
                await renderPage(pdfDocument, 1)
            } catch (err) {
                console.error("Error loading PDF:", err)
                setError("Failed to load PDF document")
            } finally {
                setIsLoading(false)
            }
        }

        loadPDF()

        return () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel()
            }
            if (pdfDoc) {
                pdfDoc.destroy()
            }
        }
    }, [file])

    useEffect(() => {
        if (!pdfDoc) return
        renderPage(pdfDoc, currentPage)
    }, [currentPage, scale, pdfDoc])

    const renderPage = async (pdf, pageNum) => {
        if (!pdf || !canvasRef.current) return

        try {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel()
            }

            const page = await pdf.getPage(pageNum)
            const viewport = page.getViewport({ scale })

            const canvas = canvasRef.current
            const context = canvas.getContext("2d")

            context.clearRect(0, 0, canvas.width, canvas.height)
            canvas.height = viewport.height
            canvas.width = viewport.width

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            }

            renderTaskRef.current = page.render(renderContext)
            await renderTaskRef.current.promise

            if (currentPageRef.current !== pageNum) {
                return
            }

            const textContent = await page.getTextContent()
            await extractAndDisplayText(textContent, viewport, pageNum)

        } catch (err) {
            if (err instanceof pdfjsLib.RenderingCancelledException) {
                return
            }
            console.error("Error rendering page:", err)
            setError("Failed to render page")
        }
    }

    const extractAndDisplayText = async (textContent, viewport) => {
        const textOverlay = textOverlayRef.current
        if (!textOverlay) return

        const items = textContent.items
        textOverlay.innerHTML = ''

        items.forEach((item, index) => {
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
            const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3])
            const fontAscent = fontSize * 0.8

            const textDiv = document.createElement("div")
            textDiv.className = "absolute text-transparent cursor-text select-text whitespace-nowrap"
            textDiv.textContent = item.str
            textDiv.style.left = tx[4] + "px"
            textDiv.style.top = (tx[5] - fontAscent) + "px"
            textDiv.style.fontSize = fontSize + "px"
            textDiv.style.fontFamily = item.fontName || "sans-serif"
            textDiv.style.pointerEvents = "auto"

            textOverlay.appendChild(textDiv)
        })
    }

    const handleMouseUp = (e) => {
        setTimeout(() => {
            const selection = window.getSelection()
            const selectedText = selection.toString().trim()

            if (selectedText) {
                setSelectedContent(selectedText)

                const range = selection.getRangeAt(0)
                const rect = range.getBoundingClientRect()
                const containerRect = pdfContainerRef.current?.getBoundingClientRect()

                if (containerRect) {
                    setSelectionPosition({
                        x: rect.left - containerRect.left + rect.width / 2,
                        y: rect.top - containerRect.top - 10,
                    })
                }
            }
        }, 10)
    }

    const handleAction = (action) => {
        handleAIAction(action, selectedContent)
        window.getSelection()?.removeAllRanges()
        setSelectionPosition(null)
    }

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages && pdfDoc) {
            setCurrentPage(newPage)
        }
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectionPopupRef.current && !selectionPopupRef.current.contains(event.target)) {
                window.getSelection()?.removeAllRanges()
                setSelectionPosition(null)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!pdfDoc) return

            if (e.key === "ArrowLeft" && currentPage > 1) {
                handlePageChange(currentPage - 1)
            } else if (e.key === "ArrowRight" && currentPage < totalPages) {
                handlePageChange(currentPage + 1)
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => {
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [currentPage, totalPages, pdfDoc])

    if (error) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-4">{error}</div>
                    <Button onClick={onClose} variant="outline">
                        Go Back
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-white relative">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                        <span className="text-white font-bold text-sm">YL</span>
                    </div>
                    <span className="text-xl font-semibold">YouLearn</span>
                    <span className="text-gray-500">{file?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowChat(!showChat)}
                        className={showChat ? "bg-blue-100 text-blue-600" : ""}
                    >
                        <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                        <Search className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                        <Sun className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                        <Share className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                        {currentPage} / {totalPages}
                    </span>
                    <select
                        className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                        value={currentPage}
                        onChange={(e) => handlePageChange(Number(e.target.value))}
                    >
                        {Array.from({ length: totalPages }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                Page {i + 1}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                        disabled={scale <= 0.5}
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm px-2">{Math.round(scale * 100)}%</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setScale(Math.min(3.0, scale + 0.1))}
                        disabled={scale >= 3.0}
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                        <RotateCw className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        ← Previous
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        Next →
                    </Button>
                </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto bg-gray-50 p-4 relative" ref={pdfContainerRef} onMouseUp={handleMouseUp}>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading PDF...
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <div className="relative bg-white shadow-lg border border-gray-200">
                                <canvas
                                    ref={canvasRef}
                                    className="block"
                                />
                                <div
                                    ref={textOverlayRef}
                                    className="absolute top-0 left-0 w-full h-full pointer-events-none select-text"
                                    style={{ userSelect: "text" }}
                                />
                            </div>
                        </div>
                    )}

                    {selectionPosition && (
                        <div ref={selectionPopupRef}>
                            <SelectionPopup
                                position={selectionPosition}
                                onAction={handleAction}
                                onClose={() => {
                                    window.getSelection()?.removeAllRanges()
                                    setSelectionPosition(null)
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Panel */}
            <ChatPanel
                isVisible={showChat}
                onClose={() => setShowChat(false)}
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isAILoading}
                currentQuestion={currentQuestion}
                setCurrentQuestion={setCurrentQuestion}
            />

            <style jsx>{`
                ::selection {
                    background: rgba(59, 130, 246, 0.3) !important;
                    color: transparent !important;
                }
                ::-moz-selection {
                    background: rgba(59, 130, 246, 0.3) !important;
                    color: transparent !important;
                }
            `}</style>
        </div>
    )
}