import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://service-report-ai-application.onrender.com/api'  // Your Render backend URL
  : 'http://localhost:5000/api';

// Create axios instance with default config
const axiosInstance = axios.create({
    baseURL: API_URL
});

// Add token to requests
axiosInstance.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const api = {
    // Authentication
    login: async (username, password) => {
        const response = await axiosInstance.post('/login', { username, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
    },

    // Audio transcription
    transcribeAudio: async (formData) => {
        try {
            console.log("Sending transcription request...");
            const response = await axios.post(`${API_URL}/transcribe`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log("Transcription response:", response.data);
            if (!response.data.success) {
                throw new Error(response.data.error || 'Transcription failed');
            }
            return response.data;
        } catch (error) {
            console.error('Transcription error details:', error.response?.data || error);
            throw error;
        }
    },

    // Translation and repair table generation
    generateTable: async (data) => {
        try {
            console.log("Sending generate table request:", data);  // Debug log
            const response = await axios.post(`${API_URL}/generate-table`, data);
            console.log("Generate table response:", response.data);  // Debug log
            return response.data;
        } catch (error) {
            console.error('Generate table error:', error.response?.data || error);
            throw error;
        }
    },

    // Language detection
    detectLanguage: async (text) => {
        const response = await axiosInstance.post('/detect-language', { text });
        return response.data;
    },

    // Translation
    translate: async (data) => {
        const response = await axiosInstance.post('/translate', data);
        return response.data;
    },

    // Send email report
    sendEmail: async (data) => {
        const response = await axiosInstance.post('/send-email', data);
        return response.data;
    },

    // Health check
    checkHealth: async () => {
        const response = await axiosInstance.get('/health');
        return response.data;
    },

    // Send report
    sendReport: async (data) => {
        const response = await axiosInstance.post('/send-report', data);
        return response.data;
    },

    // Generate email preview
    generateEmailPreview: async (data) => {
        try {
            const response = await axios.post(`${API_URL}/preview-email`, data);
            return response.data;
        } catch (error) {
            console.error('Preview generation error:', error);
            throw error;
        }
    }
}; 