/**
 * API Client for RAG Resume Chatbot Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Send a chat message and get AI response
 */
export async function sendMessage(message, contextChunks = 3) {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message,
            context_chunks: contextChunks,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
}

/**
 * Get system status
 */
export async function getStatus() {
    const response = await fetch(`${API_BASE_URL}/api/status`);

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

/**
 * Initialize the RAG system
 */
export async function initializeRAG(forceReload = false) {
    const response = await fetch(`${API_BASE_URL}/api/initialize?force_reload=${forceReload}`, {
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

/**
 * Upload a resume PDF
 */
export async function uploadResume(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Upload failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Reset the system
 */
export async function resetSystem() {
    const response = await fetch(`${API_BASE_URL}/api/reset`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

/**
 * Get sample questions
 */
export async function getSampleQuestions() {
    const response = await fetch(`${API_BASE_URL}/api/sample-questions`);

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}
