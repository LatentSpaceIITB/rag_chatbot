import React, { useState } from "react";
import { YouTubeViewer } from "../pages/YouTubeViewer"; // Import your YouTubeViewer component
import { Button } from "./Button";
import { Link } from "lucide-react";
// import axios from "axios"; // Uncomment when backend is ready
import { useNavigate } from 'react-router-dom'
export const PasteModal = ({
    isOpen,
    onClose,
    onAdd,
    urlInput,
    onUrlChange,
    textInput,
    onTextChange,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showYouTubeViewer, setShowYouTubeViewer] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [youtubeTitle, setYoutubeTitle] = useState("");
    const navigate = useNavigate();
    const isYouTubeUrl = (url) => {
        const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
        return pattern.test(url);
    };

    const handleUrlChange = async (url) => {
        onUrlChange(url);
        setError(null);

        if (isYouTubeUrl(url)) {
            // Commented out API call - uncomment when backend is ready
            /*
            setIsLoading(true);
            try {
                const response = await axios.post("http://localhost:8000/api/chat/url-link", { url });
                console.log(url);

                // If you want to automatically show the YouTube viewer when a valid URL is entered:
                setYoutubeUrl(url);
                setShowYouTubeViewer(true);
                setYoutubeTitle(response.data?.title || "YouTube Video"); // Use actual title from response if available

                // Optional: populate text area from response
                // onTextChange(response.data.transcript || response.data.summary || "Content processed successfully");
            } catch (err) {
                setError(err.response?.data?.error || err.message || "Failed to process YouTube URL");
            } finally {
                setIsLoading(false);
            }
            */

            // Simplified version without API call
            setYoutubeUrl(url);
            setYoutubeTitle("YouTube Video"); // Default title
        }
    };

    const handleAdd = () => {
        if (isYouTubeUrl(urlInput)) {
            // For YouTube URLs, navigate to the viewer page with state
            navigate('/youtubeshow', {
                state: {
                    videoUrl: urlInput,
                    videoTitle: "YouTube Video" // You can get the actual title from an API later
                }
            });
        } else {
            // For other URLs or text, call the onAdd prop
            onAdd();
        }
    };

    const handleBackFromYouTube = () => {
        setShowYouTubeViewer(false);
    };

    if (!isOpen) return null;

    // Render YouTubeViewer if we have a YouTube URL and the flag is set
    if (showYouTubeViewer && youtubeUrl) {
        return (
            <YouTubeViewer
                videoUrl={youtubeUrl}
                videoTitle={youtubeTitle}
                onBack={handleBackFromYouTube}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-black border border-gray-700 rounded-lg w-full max-w-2xl mx-4 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link className="w-5 h-5" />
                            <h2 className="text-lg font-semibold">YouTube, Website, Etc</h2>
                        </div>
                        <p className="text-sm text-gray-300">
                            Enter a YouTube Link / Playlist, Website URL, Doc, ArXiv, Etc
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* URL Input */}
                <div className="mb-6">
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="https://youtu.be/dQw4w9WgXcQ"
                        className="w-full bg-[#212121] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                    />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="text-gray-400 text-sm">or</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {/* Paste Text Section */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <h3 className="font-semibold">Paste Text</h3>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">Copy and paste text to add as content</p>
                    <textarea
                        value={textInput}
                        onChange={(e) => onTextChange(e.target.value)}
                        placeholder="Paste your notes here"
                        rows={8}
                        className="w-full bg-[#212121] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-300 focus:outline-none focus:border-green-500 resize-none"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAdd}
                        className="bg-white text-black hover:bg-gray-200"
                        disabled={isLoading}
                    >
                        {isLoading ? "Processing..." : "Add"}
                    </Button>
                </div>
            </div>
        </div>
    );
};