import React, { useState, useRef } from 'react';
import { uploadResume } from '../api';

/**
 * LandingPage Component
 * Stunning hero section with PDF upload functionality
 */
function LandingPage({ onUploadSuccess, onStartChat, hasResume }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileUpload = async (file) => {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setUploadError('Please upload a PDF file');
            return;
        }

        setIsUploading(true);
        setUploadError(null);
        setUploadedFile(file.name);

        try {
            const result = await uploadResume(file);
            if (result.status === 'success') {
                onUploadSuccess();
            } else {
                setUploadError(result.message || 'Upload failed');
            }
        } catch (err) {
            setUploadError(err.message || 'Failed to upload. Make sure the backend is running.');
            console.error('Upload error:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="badge-icon">✨</span>
                        <span>Powered by Gemini AI & RAG Technology</span>
                    </div>

                    <h1 className="hero-title">
                        Your Resume,
                        <br />
                        <span className="gradient-text">Supercharged with AI</span>
                    </h1>

                    <p className="hero-description">
                        Upload your resume and get instant, intelligent answers to any questions
                        about your experience, skills, and background. Perfect for interview prep
                        and portfolio showcases.
                    </p>

                    {/* Upload Area */}
                    <div
                        className={`upload-area ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={openFileDialog}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".pdf"
                            hidden
                        />

                        {isUploading ? (
                            <div className="upload-loading">
                                <div className="upload-spinner"></div>
                                <p>Processing your resume...</p>
                            </div>
                        ) : (
                            <>
                                <div className="upload-icon">📄</div>
                                <h3>Drop your resume here</h3>
                                <p>or click to browse</p>
                                <span className="upload-hint">Supports PDF files only</span>
                            </>
                        )}
                    </div>

                    {uploadError && (
                        <div className="upload-error">
                            <span>⚠️</span> {uploadError}
                        </div>
                    )}

                    {uploadedFile && !uploadError && !isUploading && (
                        <div className="upload-success">
                            <span>✅</span> Uploaded: {uploadedFile}
                        </div>
                    )}

                    {/* Alternative: Start with existing resume */}
                    {hasResume && (
                        <button className="secondary-cta" onClick={onStartChat}>
                            Continue with existing resume →
                        </button>
                    )}
                </div>

                {/* Hero Visual */}
                <div className="hero-visual">
                    <div className="visual-card">
                        <div className="visual-header">
                            <div className="visual-dots">
                                <span></span><span></span><span></span>
                            </div>
                            <span className="visual-title">ResumeAI Chat</span>
                        </div>
                        <div className="visual-content">
                            <div className="chat-preview user">
                                What are your technical skills?
                            </div>
                            <div className="chat-preview ai">
                                I'm proficient in Python, SQL, and Data Engineering...
                            </div>
                            <div className="chat-preview user">
                                Tell me about your projects
                            </div>
                            <div className="typing-preview">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <h2 className="section-title">Why ResumeAI?</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🧠</div>
                        <h3>RAG-Powered</h3>
                        <p>Retrieval-Augmented Generation ensures accurate, context-aware answers from YOUR resume.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">⚡</div>
                        <h3>Instant Answers</h3>
                        <p>Get immediate responses to any question about your experience and skills.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🔒</div>
                        <h3>Privacy First</h3>
                        <p>Your resume stays on your local machine. No data is stored permanently.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🎯</div>
                        <h3>Interview Ready</h3>
                        <p>Practice answering questions about your background before the big interview.</p>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="how-section">
                <h2 className="section-title">How It Works</h2>
                <div className="steps-container">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h3>Upload Resume</h3>
                        <p>Drag & drop your PDF resume or click to browse</p>
                    </div>
                    <div className="step-arrow">→</div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h3>AI Processing</h3>
                        <p>Gemini AI analyzes and understands your resume</p>
                    </div>
                    <div className="step-arrow">→</div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h3>Ask Anything</h3>
                        <p>Get accurate answers about your experience</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default LandingPage;
