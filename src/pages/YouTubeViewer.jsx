import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Card, CardContent } from "../components/Card";
import { ArrowLeft, MessageCircle, ChevronUp, ChevronDown, FileText, BookOpen, BarChart3, StickyNote, Loader2 } from "lucide-react";
import { CreditCard, HelpCircle } from 'lucide-react';
import axios from 'axios';

export const YouTubeViewer = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { videoUrl, videoTitle } = location.state || {};

    const [chatInput, setChatInput] = useState("");
    const [messages, setMessages] = useState([
        { id: 1, type: "ai", content: "Hello! I can help you understand this video content. What would you like to know?" },
    ]);
    const [activeTab, setActiveTab] = useState("chapters");
    const [rightPanelTab, setRightPanelTab] = useState("chat");
    const [isPanelExpanded, setIsPanelExpanded] = useState(false);

    // New state for transcript handling
    const [transcript, setTranscript] = useState([]);
    const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
    const [transcriptError, setTranscriptError] = useState(null);
    const [formattedTranscript, setFormattedTranscript] = useState('');
    const panelContentRef = useRef(null);

    // Extract YouTube video ID from URL
    const getYouTubeVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
    };

    const videoId = getYouTubeVideoId(videoUrl);
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

    const formatTranscript = (transcriptData) => {
        if (!transcriptData || !Array.isArray(transcriptData)) return '';

        let formatted = '';
        let currentTime = 0;
        let paragraph = '';

        transcriptData.forEach((item, index) => {
            // Convert offset to minutes and seconds
            const minutes = Math.floor(item.offset / 60);
            const seconds = Math.floor(item.offset % 60);
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // If we've moved to a new time block (every 30 seconds)
            if (Math.floor(item.offset) > Math.floor(currentTime) + 30) {
                if (paragraph) {
                    formatted += `${paragraph}\n\n`;
                    paragraph = '';
                }
                formatted += `${timeString} `;
                currentTime = item.offset;
            }

            // Add text to current paragraph
            paragraph += item.text + ' ';

            // Handle special cases like [Music] or [Applause]
            if (item.text.includes('[Music]') || item.text.includes('[Applause]')) {
                formatted += `${timeString} ${item.text}\n`;
                paragraph = '';
            }
        });

        // Add any remaining text
        if (paragraph) {
            formatted += paragraph;
        }

        return formatted;
    };


    // Function to fetch transcript using axios
    const fetchTranscript = async (videoUrl) => {
        setIsLoadingTranscript(true);
        setTranscriptError(null);

        try {
            const response = await axios.post('http://localhost:8000/api/youtube/transcript',
                { videoUrl },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                }
            );

            const data = response.data;
            console.log(data);

            // Convert data to markdown format
            const markdownTranscript = convertToMarkdown(data);
            console.log(markdownTranscript);

            setTranscript(markdownTranscript);

        } catch (error) {
            console.error('Failed to fetch transcript:', error);

            if (error.response) {
                setTranscriptError(`Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
            } else if (error.request) {
                setTranscriptError('Network error: Unable to reach server');
            } else if (error.code === 'ECONNABORTED') {
                setTranscriptError('Request timeout: Please try again');
            } else {
                setTranscriptError('Failed to load transcript. Please try again.');
            }
        } finally {
            setIsLoadingTranscript(false);
        }
    };

    // Helper function to convert transcript data to markdown
    const convertToMarkdown = (data) => {
        // Handle different data structures
        if (typeof data === 'string') {
            return data; // Already a string, return as is
        }

        if (Array.isArray(data)) {
            // If it's an array of transcript segments
            return data.map((segment, index) => {
                if (typeof segment === 'object' && segment.text) {
                    // If segment has timestamp
                    if (segment.start || segment.timestamp) {
                        const time = segment.start || segment.timestamp;
                        const formattedTime = formatTime(time);
                        return `**[${formattedTime}]** ${segment.text}`;
                    }
                    return `${segment.text}`;
                }
                return segment.toString();
            }).join('\n\n');
        }

        if (typeof data === 'object') {
            // If it's an object with transcript property
            if (data.transcript) {
                return convertToMarkdown(data.transcript);
            }

            // If it's an object with text segments
            if (data.segments || data.items) {
                return convertToMarkdown(data.segments || data.items);
            }

            // Convert object properties to markdown
            return Object.entries(data)
                .map(([key, value]) => `**${key}:** ${value}`)
                .join('\n\n');
        }

        return data.toString();
    };

    // Helper function to format time (seconds to MM:SS or HH:MM:SS)
    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Function to send chat messages using axios (example) - COMMENTED OUT FOR NOW
    // const sendChatMessage = async (message) => {
    //     try {
    //         const response = await axios.post('/api/chat', 
    //             { 
    //                 message: message,
    //                 videoUrl: videoUrl,
    //                 context: 'youtube_video'
    //             },
    //             {
    //                 headers: {
    //                     'Content-Type': 'application/json',
    //                 },
    //                 timeout: 15000, // 15 second timeout for chat
    //             }
    //         );

    //         return response.data;
    //     } catch (error) {
    //         console.error('Failed to send chat message:', error);
    //         throw error;
    //     }
    // };

    // Helper function to format seconds to MM:SS format


    // Sample transcript as fallback
    const getSampleTranscript = () => [
        {
            time: "00:00",
            text: "Erin wins the toss and chooses to bat, with a promising lineup capable of dismantling any bowling attack. Recent debutant Zeal showed good form in his first match, while Finch has made three changes to his team.",
        },
        {
            time: "00:30",
            text: "Mendes, Raul Sharma, and Shakaya are replaced by Ali, Marta, Ishwa, Panley, and Mitchell Marsh for Pony Wanderers. Gale's previous innings showcased his adaptability, while Dilshan provided a rapid start. The team hopes to leverage batting first tonight.",
        },
        {
            time: "01:02",
            text: "RCB has shown a preference for chasing targets, successfully achieving victory in four out of five matches by chasing. The team features effective swing bowlers, particularly noted for their ability to generate movement. Key players like Gayle and Dilshan demonstrate strong strike power while also demonstrating finesse in shot selection, contributing significantly to their successful performances.",
        },
        {
            time: "03:14",
            text: "Chris Gayle's performance has been exceptional throughout the tournament, showcasing his ability to adapt to different match situations and providing crucial contributions to the team's success.",
        },
    ];

    // Fetch transcript when component mounts or videoUrl changes
    useEffect(() => {
        if (videoUrl) {
            fetchTranscript(videoUrl);
        } else {
            // Use sample data if no video URL
            setTranscript(getSampleTranscript());
        }
    }, [videoUrl]);

    // Function to handle clicking on transcript or chapter items
    const handleItemClick = (text, time) => {
        const prompt = `Tell me more about: "${text}" (from ${time})`;
        setChatInput(prompt);
        setRightPanelTab("chat"); // Switch to chat tab
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        const newMessage = {
            id: messages.length + 1,
            type: "user",
            content: chatInput,
        };

        setMessages([...messages, newMessage]);
        setChatInput("");

        // COMMENTED OUT CHAT API FOR NOW - Using simple response
        // try {
        //     // Use axios for chat API call
        //     const aiResponseData = await sendChatMessage(currentInput);
        //     
        //     const aiResponse = {
        //         id: messages.length + 2,
        //         type: "ai",
        //         content: aiResponseData.response || "I understand your question about the video content. Let me help you with that...",
        //     };
        //     setMessages((prev) => [...prev, aiResponse]);
        // } catch (error) {
        //     // Handle chat error
        //     const errorResponse = {
        //         id: messages.length + 2,
        //         type: "ai",
        //         content: "Sorry, I'm having trouble responding right now. Please try again.",
        //     };
        //     setMessages((prev) => [...prev, errorResponse]);
        // }

        // Simple AI response for now
        setTimeout(() => {
            const aiResponse = {
                id: messages.length + 2,
                type: "ai",
                content: "I understand your question about the video content. Let me help you with that...",
            };
            setMessages((prev) => [...prev, aiResponse]);
        }, 1000);
    };

    const handleBack = () => {
        navigate(-1);
    };

    // Sample chapters data
    const chapters = [
        {
            time: "00:00",
            title: "Match Overview",
            description: "Erin wins the toss and chooses to bat, with a promising lineup capable of dismantling any bowling attack. Recent debutant Zeal showed good form in his first match, while Finch has made three changes to his team.",
        },
        {
            time: "00:30",
            title: "Team Changes",
            description: "Mendes, Raul Sharma, and Shakaya are replaced by Ali, Marta, Ishwa, Panley, and Mitchell Marsh for Pony Wanderers. Gale's previous innings showcased his adaptability, while Dilshan provided a rapid start.",
        },
        {
            time: "01:02",
            title: "RCB Batting Strategy",
            description: "RCB has shown a preference for chasing targets, successfully achieving victory in four out of five matches by chasing. The team features effective swing bowlers, particularly noted for their ability to generate movement.",
        },
        {
            time: "03:14",
            title: "Chris Gayle Performance",
            description: "Key players like Gayle and Dilshan demonstrate strong strike power while also demonstrating finesse in shot selection, contributing significantly to their successful performances.",
        },
    ];

    // Scroll to bottom of panel content when it opens
    useEffect(() => {
        if (isPanelExpanded && panelContentRef.current) {
            panelContentRef.current.scrollTop = panelContentRef.current.scrollHeight;
        }
    }, [isPanelExpanded, activeTab]);

    return (
        <div className="h-screen bg-black text-white overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-800 p-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                            <span className="text-sm font-bold">YL</span>
                        </div>
                        <span className="font-semibold">YouLearn</span>
                    </div>
                    <div className="flex-1 text-center">
                        <h1 className="text-lg font-medium truncate">{videoTitle || "YouTube Video Analysis"}</h1>
                    </div>
                </div>
            </div>

            <div className="flex h-[calc(100vh-80px)] overflow-hidden">
                {/* Left Side - Video and Transcript/Chapters */}
                <div className="w-4/7 p-6 flex flex-col overflow-hidden">
                    {/* Video Player - Hidden when panel is expanded */}
                    {!isPanelExpanded && (
                        <div className="mb-4 flex-shrink-0">
                            <div className="aspect-video bg-[#212121] rounded-lg overflow-hidden max-w-4xl mx-auto">
                                {embedUrl ? (
                                    <iframe
                                        src={embedUrl}
                                        className="w-full h-full"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title="YouTube video player"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">Invalid YouTube URL</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Chapters and Transcripts Panel */}
                    <div className="max-w-4xl flex flex-col flex-1 min-h-0">
                        {/* Tab Headers with Expand/Collapse Button */}
                        <div className="flex gap-2 mb-4 flex-shrink-0">
                            <div className="flex bg-[#1a1a1a] rounded-full p-1 border border-gray-700">
                                <button
                                    onClick={() => setActiveTab("chapters")}
                                    className={`px-4 py-2 rounded-full flex gap-2 transition-colors text-sm ${activeTab === "chapters" ? "bg-[#2d2d2d] text-white" : "text-gray-400 hover:text-gray-300"
                                        }`}
                                >
                                    <BookOpen className="w-4 h-4" />
                                    <span>Chapters</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab("transcripts")}
                                    className={`px-4 py-2 rounded-full flex gap-2 transition-colors text-sm ${activeTab === "transcripts" ? "bg-[#2d2d2d] text-white" : "text-gray-400 hover:text-gray-300"
                                        }`}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>Transcripts</span>
                                    {isLoadingTranscript && <Loader2 className="w-3 h-3 animate-spin" />}
                                </button>
                            </div>

                            <button
                                onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                                className="bg-[#2d2d2d] text-gray-300 p-3 rounded-full hover:bg-[#3d3d3d] border border-gray-600"
                                title={isPanelExpanded ? "Collapse panel" : "Expand panel"}
                            >
                                {isPanelExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Panel Content */}
                        <div
                            ref={panelContentRef}
                            className={`bg-[#1a1a1a] rounded-lg border border-gray-700 transition-all duration-300 ${isPanelExpanded
                                ? "flex-1 min-h-0"
                                : "h-[200px]"
                                }`}
                        >
                            <div className="p-4 h-full overflow-y-auto">
                                {activeTab === "chapters" ? (
                                    <div className="space-y-6">
                                        {chapters.map((chapter, index) => (
                                            <div key={index} className="group">
                                                <div
                                                    className="flex items-start gap-4 cursor-pointer hover:bg-[#2d2d2d] p-3 rounded-lg transition-colors"
                                                    onClick={() => handleItemClick(chapter.description, chapter.time)}
                                                >
                                                    <div className="text-xs text-gray-500 font-mono bg-[#2d2d2d] px-2 py-1 rounded">
                                                        {chapter.time}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-white font-medium text-lg mb-2 group-hover:text-blue-300 transition-colors">
                                                            {chapter.title}
                                                        </h3>
                                                        <p className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-200 transition-colors">
                                                            {chapter.description}
                                                        </p>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MessageCircle className="w-4 h-4 text-blue-400" />
                                                    </div>
                                                </div>
                                                {index < chapters.length - 1 && <div className="h-px bg-gray-700 my-4 ml-16" />}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Loading State */}
                                        {isLoadingTranscript && (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                                                <span className="text-gray-400">Loading transcript...</span>
                                            </div>
                                        )}

                                        {/* Error State */}
                                        {transcriptError && (
                                            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                                                <p className="text-red-400 text-sm">{transcriptError}</p>
                                                <button
                                                    onClick={() => fetchTranscript(videoUrl)}
                                                    className="mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
                                                >
                                                    Try again
                                                </button>
                                            </div>
                                        )}

                                        {/* Transcript Content */}
                                        {!isLoadingTranscript && transcript && Array.isArray(transcript) && transcript.length > 0 && (
                                            <>
                                                {transcript.map((item, index) => (
                                                    <div key={index} className="group">
                                                        <div
                                                            className="flex items-start gap-4 cursor-pointer hover:bg-[#2d2d2d] p-3 rounded-lg transition-colors"
                                                            onClick={() => handleItemClick(item.text, item.time)}
                                                        >
                                                            <div className="text-xs text-gray-500 font-mono bg-[#2d2d2d] px-2 py-1 rounded hover:bg-blue-600 hover:text-white transition-colors">
                                                                {item.time}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-100 transition-colors">
                                                                    {item.text}
                                                                </p>
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MessageCircle className="w-4 h-4 text-blue-400" />
                                                            </div>
                                                        </div>
                                                        {index < transcript.length - 1 && <div className="h-px bg-gray-700 my-4 ml-16" />}
                                                    </div>
                                                ))}
                                            </>
                                        )}

                                        {/* Empty State */}
                                        {!isLoadingTranscript && !transcriptError && transcript.length === 0 && (
                                            <div className="text-center py-8">
                                                <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                                                <p className="text-gray-400">No transcript available for this video</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Chat and Tools */}
                <div className="w-3/7 flex flex-col bg-[#212121] overflow-hidden">
                    <div className="flex-1 flex flex-col">
                        <div className="flex">
                            <button
                                onClick={() => setRightPanelTab("chat")}
                                className={`px-4 py-3 flex items-center gap-2 text-sm transition-colors ${rightPanelTab === "chat"
                                    ? "rounded-xl bg-black text-white"
                                    : "hover:text-gray-300"
                                    }`}
                            >
                                <MessageCircle className="w-4 h-4" />
                                Chat
                            </button>
                            <button
                                onClick={() => setRightPanelTab("flashcard")}
                                className={`px-4 py-3 flex items-center gap-2 text-sm transition-colors ${rightPanelTab === "flashcard"
                                    ? "rounded-xl bg-black text-white"
                                    : "hover:text-gray-300"
                                    }`}
                            >
                                <CreditCard className="w-4 h-4" />
                                Flashcard
                            </button>
                            <button
                                onClick={() => setRightPanelTab("quizzes")}
                                className={`px-4 py-3 flex items-center gap-2 text-sm transition-colors ${rightPanelTab === "quizzes"
                                    ? "rounded-xl bg-black text-white"
                                    : "hover:text-gray-300"
                                    }`}
                            >
                                <HelpCircle className="w-4 h-4" />
                                Quizzes
                            </button>
                            <button
                                onClick={() => setRightPanelTab("summary")}
                                className={`px-4 py-3 flex items-center gap-2 text-sm transition-colors ${rightPanelTab === "summary"
                                    ? "rounded-xl bg-black text-white"
                                    : "hover:text-gray-300"
                                    }`}
                            >
                                <BarChart3 className="w-4 h-4" />
                                Summary
                            </button>
                            <button
                                onClick={() => setRightPanelTab("notes")}
                                className={`px-4 py-3 flex items-center gap-2 text-sm transition-colors ${rightPanelTab === "notes"
                                    ? "rounded-xl bg-black text-white"
                                    : "hover:text-gray-300"
                                    }`}
                            >
                                <StickyNote className="w-4 h-4" />
                                Notes
                            </button>
                        </div>

                        <div className="flex-1 bg-[#1a1a1a] mt-0 rounded-b-lg">
                            {rightPanelTab === "chat" && (
                                <div className="flex flex-col h-full p-4">
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-[#2d2d2d] rounded-full flex items-center justify-center mx-auto mb-4">
                                            <MessageCircle className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2 text-white">Learn with the AI Tutor</h3>
                                        <p className="text-sm text-gray-400">Ask questions about the video content</p>
                                    </div>

                                    {/* Chat Messages */}
                                    <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                                            >
                                                <div
                                                    className={`max-w-[80%] p-3 rounded-lg ${message.type === "user"
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-[#2d2d2d] text-gray-200"
                                                        }`}
                                                >
                                                    <p className="text-sm">{message.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Chat Input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            placeholder="Ask anything"
                                            className="flex-1 bg-[#2d2d2d] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                                        />
                                        <Button onClick={handleSendMessage} size="sm" className="bg-blue-600 hover:bg-blue-700">
                                            Send
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {rightPanelTab === "summary" && (
                                <div className="p-4 h-full">
                                    <h3 className="font-semibold mb-3 text-white">Video Summary</h3>
                                    <div className="space-y-3 text-sm text-gray-300">
                                        <p>This video covers the main concepts and provides detailed explanations...</p>
                                        <p>Key takeaways include important points that viewers should remember...</p>
                                        <p>The content is structured to help learners understand complex topics...</p>
                                    </div>
                                </div>
                            )}

                            {rightPanelTab === "notes" && (
                                <div className="p-4 h-full">
                                    <h3 className="font-semibold mb-3 text-white">Your Notes</h3>
                                    <textarea
                                        placeholder="Take notes while watching..."
                                        className="w-full h-32 bg-[#2d2d2d] border border-gray-600 rounded p-2 text-sm text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {rightPanelTab === "flashcard" && (
                                <div className="p-4 h-full">
                                    <h3 className="font-semibold mb-3 text-white">Flashcards</h3>
                                    <p className="text-gray-400 text-sm">Generate flashcards from video content...</p>
                                </div>
                            )}

                            {rightPanelTab === "quizzes" && (
                                <div className="p-4 h-full">
                                    <h3 className="font-semibold mb-3 text-white">Quizzes</h3>
                                    <p className="text-gray-400 text-sm">Test your knowledge with auto-generated quizzes...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};