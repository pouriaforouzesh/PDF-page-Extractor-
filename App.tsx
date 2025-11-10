
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Scissors, Download, Loader, AlertCircle, RefreshCw } from './components/Icons';

// pdf-lib and pdf.js are loaded dynamically, so we declare them here to satisfy TypeScript
declare const PDFLib: any;
declare const pdfjsLib: any;

// Helper component for file uploading
const FileUploader: React.FC<{ onFileSelect: (file: File) => void; isProcessing: boolean }> = ({ onFileSelect, isProcessing }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (isProcessing) return;
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            if (files[0].type === 'application/pdf') {
                onFileSelect(files[0]);
            }
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onFileSelect(files[0]);
        }
    };

    const onButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div 
            className="w-full max-w-lg p-8 border-2 border-dashed border-gray-600 rounded-2xl text-center cursor-pointer hover:border-indigo-500 hover:bg-gray-800/50 transition-all duration-300"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={onButtonClick}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={isProcessing}
            />
            <div className="flex flex-col items-center justify-center space-y-4 text-gray-400">
                <UploadCloud className="w-16 h-16 text-gray-500" />
                <p className="text-xl font-semibold">Drag & drop your PDF here</p>
                <p>or</p>
                <button
                    type="button"
                    className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
                >
                    Browse File
                </button>
            </div>
        </div>
    );
};

const PdfPreview: React.FC<{ pdfBytes: Uint8Array }> = ({ pdfBytes }) => {
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pdfBytes || !canvasContainerRef.current) return;

        const renderPdf = async () => {
            setIsLoading(true);
            setError(null);
            if (canvasContainerRef.current) {
                canvasContainerRef.current.innerHTML = '';
            }

            try {
                const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
                const pdf = await loadingTask.promise;
                const numPages = pdf.numPages;

                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 0.5 });
                    const canvas = document.createElement('canvas');
                    canvas.className = 'bg-white rounded-md shadow-lg';
                    const context = canvas.getContext('2d');
                    if (!context) continue;
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    canvasContainerRef.current?.appendChild(canvas);

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };
                    await page.render(renderContext).promise;
                }
            } catch (err) {
                console.error("Error rendering PDF preview:", err);
                setError("Could not generate a preview for this PDF.");
            } finally {
                setIsLoading(false);
            }
        };

        renderPdf();
    }, [pdfBytes]);

    if (error) {
         return (
            <div className="p-4 bg-yellow-900/50 border border-yellow-500 text-yellow-300 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0"/>
                <span>{error}</span>
            </div>
        )
    }

    return (
        <div>
            {isLoading && (
                <div className="flex items-center justify-center p-8 text-gray-400">
                    <Loader className="w-8 h-8" />
                    <span className="ml-3 text-lg">Generating Preview...</span>
                </div>
            )}
            <div
                ref={canvasContainerRef}
                className="flex overflow-x-auto space-x-4 p-4 bg-gray-900/50 rounded-lg border border-gray-600 min-h-[100px]"
                style={{ display: isLoading ? 'none' : 'flex' }}
            >
                {/* Canvases will be appended here */}
            </div>
        </div>
    );
};


export default function App() {
    const [file, setFile] = useState<File | null>(null);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [pageInput, setPageInput] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [outputPdfUrl, setOutputPdfUrl] = useState<string | null>(null);
    const [outputPdfBytes, setOutputPdfBytes] = useState<Uint8Array | null>(null);
    const [librariesReady, setLibrariesReady] = useState<boolean>(false);

    useEffect(() => {
        let pdfLibLoaded = typeof PDFLib !== 'undefined';
        let pdfJsLoaded = typeof pdfjsLib !== 'undefined';

        const checkAndSetReady = () => {
            if (pdfLibLoaded && pdfJsLoaded) {
                setLibrariesReady(true);
            }
        };

        if (pdfLibLoaded && pdfJsLoaded) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
            checkAndSetReady();
            return;
        }

        const scripts: HTMLScriptElement[] = [];

        if (!pdfLibLoaded) {
            const pdfLibScript = document.createElement('script');
            pdfLibScript.src = "https://cdn.jsdelivr.net/npm/pdf-lib/dist/pdf-lib.min.js";
            pdfLibScript.async = true;
            pdfLibScript.onload = () => { pdfLibLoaded = true; checkAndSetReady(); };
            pdfLibScript.onerror = () => setError("Failed to load PDF creation library. Please refresh.");
            document.body.appendChild(pdfLibScript);
            scripts.push(pdfLibScript);
        }

        if (!pdfJsLoaded) {
            const pdfJsScript = document.createElement('script');
            pdfJsScript.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
            pdfJsScript.async = true;
            pdfJsScript.onload = () => {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
                pdfJsLoaded = true; 
                checkAndSetReady(); 
            };
            pdfJsScript.onerror = () => setError("Failed to load PDF preview library. Please refresh.");
            document.body.appendChild(pdfJsScript);
            scripts.push(pdfJsScript);
        }

        return () => {
            scripts.forEach(s => document.body.removeChild(s));
        };
    }, []);

    const handleFileSelect = useCallback(async (selectedFile: File) => {
        if (isProcessing) return;

        if (!librariesReady) {
            setError('PDF libraries are not ready. Please wait a moment and try again.');
            return;
        }

        resetState();
        setFile(selectedFile);
        setIsProcessing(true);
        setError(null);

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            setTotalPages(pdfDoc.getPageCount());
        } catch (e: any) {
            console.error("Error processing PDF file:", e);
            
            let userFriendlyError = 'Could not read the PDF file. Please ensure it is a valid, uncorrupted file.';
            
            if (e.constructor.name === 'PDFInvalidPasswordError' || (e.message && e.message.toLowerCase().includes('encrypted'))) {
                userFriendlyError = 'This PDF is password-protected. This application cannot process encrypted or password-protected files.';
            }

            setError(userFriendlyError);
            setFile(null);
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, librariesReady]);

    const parsePageString = (input: string, max: number): number[] => {
        const pages = new Set<number>();
        const parts = input.split(',').map(p => p.trim());

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > max) {
                    throw new Error(`Invalid range: "${part}". Pages must be between 1 and ${max}.`);
                }
                for (let i = start; i <= end; i++) {
                    pages.add(i - 1); // 0-indexed
                }
            } else {
                const page = Number(part);
                if (isNaN(page) || page < 1 || page > max) {
                    throw new Error(`Invalid page: "${part}". Pages must be between 1 and ${max}.`);
                }
                pages.add(page - 1); // 0-indexed
            }
        }
        if(pages.size === 0 && input.length > 0) {
            throw new Error("Please enter valid page numbers.");
        }
        if(pages.size === 0) {
            throw new Error("No pages selected. Please enter page numbers to extract.");
        }
        return Array.from(pages).sort((a, b) => a - b);
    };

    const handleExtract = async () => {
        if (!file || isProcessing) return;

        setIsProcessing(true);
        setError(null);
        setOutputPdfUrl(null);
        setOutputPdfBytes(null);
        
        try {
            const pageIndices = parsePageString(pageInput, totalPages);
            
            const { PDFDocument } = PDFLib;
            const existingPdfBytes = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(existingPdfBytes);

            const newPdfDoc = await PDFDocument.create();
            const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach(page => newPdfDoc.addPage(page));

            const pdfBytes = await newPdfDoc.save();
            setOutputPdfBytes(pdfBytes);

            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setOutputPdfUrl(url);

        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred during PDF processing.');
            setOutputPdfUrl(null);
            setOutputPdfBytes(null);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const resetState = () => {
        setFile(null);
        setTotalPages(0);
        setPageInput('');
        setIsProcessing(false);
        setError(null);
        if (outputPdfUrl) {
            URL.revokeObjectURL(outputPdfUrl);
        }
        setOutputPdfUrl(null);
        setOutputPdfBytes(null);
    };

    const renderContent = () => {
        // State 1: Library is loading.
        if (!librariesReady) {
            if (error) return null;
            return (
                 <div className="flex flex-col items-center justify-center space-y-4 text-gray-400 p-8 min-h-[260px]">
                    <Loader className="w-12 h-12 text-gray-500" />
                    <p className="text-lg font-semibold text-gray-300">Initializing PDF Engines...</p>
                    <p className="text-sm text-gray-500">This should only take a moment.</p>
                </div>
            );
        }

        // State 2: Library is ready, no file selected yet. Show the uploader.
        if (!file) {
            return <FileUploader onFileSelect={handleFileSelect} isProcessing={isProcessing} />;
        }

        // State 3: File is selected. Show the extraction controls.
        return (
            <div className="space-y-6">
                <div className="bg-gray-700/50 p-4 rounded-lg flex items-center space-x-4">
                    <FileText className="w-8 h-8 text-indigo-400 flex-shrink-0" />
                    <div className="overflow-hidden">
                        <p className="font-semibold text-white truncate">{file.name}</p>
                        <p className="text-sm text-gray-400">{totalPages} pages</p>
                    </div>
                </div>
                
                <div>
                    <label htmlFor="pages" className="block text-sm font-medium text-gray-300 mb-2">
                        Pages to extract
                    </label>
                    <input
                        type="text"
                        id="pages"
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        placeholder="e.g., 1, 3-5, 8"
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        disabled={isProcessing}
                        aria-describedby="pages-format"
                    />
                    <p id="pages-format" className="text-xs text-gray-500 mt-2">Use commas to separate pages and hyphens for ranges.</p>
                </div>

                <button
                    onClick={handleExtract}
                    disabled={isProcessing || !pageInput}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300"
                >
                    {isProcessing ? (
                        <>
                            <Loader className="w-5 h-5"/>
                            Processing...
                        </>
                    ) : (
                        <>
                            <Scissors className="w-5 h-5"/>
                            Extract Pages
                        </>
                    )}
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-2xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">PDF Page Extractor</h1>
                    <p className="text-lg text-gray-400">Select pages from your PDF and create a new one instantly.</p>
                </header>

                <main className="bg-gray-800/50 p-6 sm:p-8 rounded-2xl shadow-2xl shadow-indigo-500/10 backdrop-blur-sm border border-gray-700">
                    {renderContent()}

                    {error && (
                        <div className="mt-6 p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0"/>
                            <span>{error}</span>
                        </div>
                    )}
                    
                    {outputPdfUrl && (
                         <div className="mt-6 p-6 bg-green-900/50 border border-green-500 rounded-lg space-y-4">
                            <h3 className="text-xl font-semibold text-green-300 text-center">Extraction Complete!</h3>
                            
                            {outputPdfBytes && librariesReady && <PdfPreview pdfBytes={outputPdfBytes} />}
                            
                             <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-green-500/30">
                                 <a
                                     href={outputPdfUrl}
                                     download={`extracted-${file?.name || 'pages.pdf'}`}
                                     className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-500 transition-colors"
                                 >
                                     <Download className="w-5 h-5"/>
                                     Download PDF
                                 </a>
                                 <button
                                     onClick={resetState}
                                     className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors"
                                 >
                                     <RefreshCw className="w-5 h-5"/>
                                     Start Over
                                 </button>
                             </div>
                         </div>
                    )}
                </main>

                <footer className="text-center mt-8 text-sm text-gray-500">
                    <p>Powered by React, Tailwind CSS, pdf-lib.js, and pdf.js</p>
                </footer>
            </div>
        </div>
    );
}
