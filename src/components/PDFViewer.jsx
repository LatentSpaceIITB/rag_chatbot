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
} from "lucide-react"
import { Button } from "./Button"
import * as pdfjsLib from "pdfjs-dist"
import "pdfjs-dist/build/pdf.worker.entry"

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

function SelectionPopup({ position, onAction, onClose }) {
    const actions = [
        { id: "chat", label: "Chat", icon: MessageCircle },
        { id: "explain", label: "Explain", icon: HelpCircle },
        { id: "quiz", label: "Quiz", icon: FileText },
        { id: "flashcards", label: "Flashcards", icon: CreditCard },
        // { id: "copy", label: "Copy", icon: FileText },
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

function TextExtractionPanel({ currentPageText, selectedText, activeTab, onTabChange }) {
    return (
        <>
            <div >
                {/* <div className="flex border-b border-gray-200">
        //         <button
        //             className={`px-4 py-2 text-sm font-medium ${activeTab === 'page' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        //             onClick={() => onTabChange('page')}
        //         >
        //             📄 Current Page Text
        //         </button>
        //         <button
        //             className={`px-4 py-2 text-sm font-medium ${activeTab === 'selected' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        //             onClick={() => onTabChange('selected')}
        //         >
        //             ✂️ Selected Text
        //         </button>
        //     </div> */}
                {/* <div className="flex-1 overflow-auto p-4">
        //         {activeTab === 'page' ? (
        //             <div className="whitespace-pre-wrap">{currentPageText || "Load a PDF to see the text content of each page here..."}</div>
        //         ) : (
        //             <textarea
        //                 className="w-full h-full p-2 border border-gray-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        //                 value={selectedText}
        //                 readOnly
        //                 placeholder="Click and drag on the PDF to select text..."
        //             />
        //         )}
        //     </div> */}
            </div>
        </>
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
    const [textItems, setTextItems] = useState([])
    const [currentPageText, setCurrentPageText] = useState("")
    const [extractionInfo, setExtractionInfo] = useState("Select a PDF to see extracted text")
    const [activeTab, setActiveTab] = useState("page")

    const pdfContainerRef = useRef(null)
    const selectionPopupRef = useRef(null)
    const canvasRef = useRef(null)
    const textOverlayRef = useRef(null)


    const renderTaskRef = useRef(null);
    const currentPageRef = useRef(currentPage); 

    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);


    useEffect(() => {
        if (!file) return;

        const loadPDF = async () => {
            try {
                setIsLoading(true);
                setError(null);
                setExtractionInfo("Loading PDF...");

                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument(arrayBuffer);
                const pdfDocument = await loadingTask.promise;

                setPdfDoc(pdfDocument);
                setTotalPages(pdfDocument.numPages);
                await renderPage(pdfDocument, 1);
            } catch (err) {
                console.error("Error loading PDF:", err);
                setError("Failed to load PDF document");
                setExtractionInfo("Error loading PDF");
            } finally {
                setIsLoading(false);
            }
        };

        loadPDF();

        return () => {
            // Clean up any pending render task
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
            if (pdfDoc) {
                pdfDoc.destroy();
            }
        };
    }, [file]);

    useEffect(() => {
        if (!pdfDoc) return;
        renderPage(pdfDoc, currentPage);
    }, [currentPage, scale, pdfDoc]);

    const renderPage = async (pdf, pageNum) => {
        if (!pdf || !canvasRef.current) return;

        try {
            // Cancel any previous render task
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }

            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            // Clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Set new canvas dimensions
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };

            // Store the render task
            renderTaskRef.current = page.render(renderContext);
            await renderTaskRef.current.promise;

            // Only proceed if this is still the current page we want to display
            if (currentPageRef.current !== pageNum) {
                return;
            }

            // Extract and setup text overlay
            const textContent = await page.getTextContent();
            await extractAndDisplayText(textContent, viewport, pageNum);

        } catch (err) {
            if (err instanceof pdfjsLib.RenderingCancelledException) {
                return;
            }
            console.error("Error rendering page:", err);
            setError("Failed to render page");
        }
    };


    const extractAndDisplayText = async (textContent, viewport) => {
        const textOverlay = textOverlayRef.current;
        if (!textOverlay) return;

        const items = textContent.items;
        setTextItems(items);

        // Clear existing text overlay
        textOverlay.innerHTML = '';

        let fullText = '';
        let lines = [];
        let currentLine = '';
        let lastY = null;

        // Create selectable text elements
        items.forEach((item, index) => {
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
            const fontAscent = fontSize * 0.8;

            const textDiv = document.createElement("div");
            textDiv.className = "absolute text-transparent cursor-text select-text whitespace-nowrap";
            textDiv.textContent = item.str;
            textDiv.style.left = tx[4] + "px";
            textDiv.style.top = (tx[5] - fontAscent) + "px";
            textDiv.style.fontSize = fontSize + "px";
            textDiv.style.fontFamily = item.fontName || "sans-serif";
            textDiv.style.pointerEvents = "auto";

            textOverlay.appendChild(textDiv);
        });

        // Group text items by lines for display in text area
        items.forEach(item => {
            const y = item.transform[5];

            if (lastY === null || Math.abs(y - lastY) > 5) {
                if (currentLine.trim()) {
                    lines.push(currentLine.trim());
                }
                currentLine = item.str;
            } else {
                currentLine += item.str;
            }
            lastY = y;
        });

        if (currentLine.trim()) {
            lines.push(currentLine.trim());
        }

        // Join lines with proper spacing
        fullText = lines.join('\n').trim();
        setCurrentPageText(fullText);

        // Update extraction info
        const wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length;
        const charCount = fullText.length;
        setExtractionInfo(`Extracted ${lines.length} lines, ${wordCount} words, ${charCount} characters from page ${currentPage}`);
    };

    const handleMouseUp = (e) => {
        setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (selectedText) {
                setSelectedContent(selectedText);
                setActiveTab("selected");

                // Get position of selection
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const containerRect = pdfContainerRef.current?.getBoundingClientRect();

                if (containerRect) {
                    setSelectionPosition({
                        x: rect.left - containerRect.left + rect.width / 2,
                        y: rect.top - containerRect.top - 10,
                    });
                }
            }
        }, 10);
    };

    const handleAction = (action) => {
        switch (action) {
            case "chat":
                onTextSelect(selectedContent);
                break;
            case "copy":
                navigator.clipboard.writeText(selectedContent);
                break;
            case "explain":
            case "quiz":
            case "flashcards":
                onTextSelect(`${action}: ${selectedContent}`);
                break;
            default:
                break;
        }

        window.getSelection()?.removeAllRanges();
        setSelectionPosition(null);
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages && pdfDoc) {
            setCurrentPage(newPage);
            // renderPage(pdfDoc, newPage);
        }
    };

    // Handle clicks outside selection popup
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectionPopupRef.current && !selectionPopupRef.current.contains(event.target)) {
                window.getSelection()?.removeAllRanges();
                setSelectionPosition(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!pdfDoc) return;

            if (e.key === "ArrowLeft" && currentPage > 1) {
                handlePageChange(currentPage - 1);
            } else if (e.key === "ArrowRight" && currentPage < totalPages) {
                handlePageChange(currentPage + 1);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [currentPage, totalPages, pdfDoc]);

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
        );
    }

    return (
        <div className="h-full flex flex-col bg-white">
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
                            <div className="text-gray-600">Loading PDF...</div>
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

                {/* Text Extraction Panel */}
                {/* <div className="h-1/3 min-h-[200px] border-t border-gray-200">
                    <TextExtractionPanel
                        currentPageText={currentPageText}
                        selectedText={selectedContent}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                </div> */}
            </div>

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