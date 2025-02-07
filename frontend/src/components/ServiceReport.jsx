import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { api } from '../services/api';
import { Navigate, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000';

function ServiceReport() {
  const [email, setEmail] = useState('adarshverma127@gmail.com');
  const [precontext, setPrecontext] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [repairList, setRepairList] = useState([]);
  const [otherInfo, setOtherInfo] = useState('');
  const [originalTranscript, setOriginalTranscript] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [audioURL, setAudioURL] = useState(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const recognitionRef = useRef(null);
  const [repairTable, setRepairTable] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repairDetails, setRepairDetails] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [emailPreview, setEmailPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'auto'; // Auto-detect language

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        if (isRecording) {
          recognition.start();
        }
      };

      recognition.onresult = handleSpeechResult;

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };

      recognitionRef.current = recognition;
    } else {
      alert('Speech recognition is not supported in your browser. Please use Chrome.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

  useEffect(() => {
    // Test API connection on component mount
    const testAPI = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/health`);
        console.log('API Health Check:', response.data);
      } catch (error) {
        console.error('API Connection Error:', error);
        alert('Cannot connect to the server. Please check if the backend is running.');
      }
    };
    
    testAPI();
  }, []);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false); // User is not authenticated
    }
  }, []);

  const handleSpeechResult = async (event) => {
    const current = event.resultIndex;
    const transcript = event.results[current][0].transcript;
    const isFinal = event.results[current].isFinal;
    
    if (isFinal) {
        try {
            // First, update original transcript
            setOriginalTranscript(prev => prev + ' ' + transcript);
            
            // Send audio for transcription and translation
            const formData = new FormData();
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
            formData.append('audio', audioBlob);
            
            const response = await axios.post(`${API_URL}/api/transcribe`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (response.data.success) {
                // Update transcripts
                setOriginalTranscript(response.data.original_transcript);
                setTranscript(response.data.english_transcript);
                setDetectedLanguage(response.data.detected_language);
                
                // Generate repair list from English transcript
                generateRepairList(response.data.english_transcript);
            }
        } catch (error) {
            console.error('Transcription error:', error);
        }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'  // Specify codec
        });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) {
        chunksRef.current.push(e.data);
            }
      };

      mediaRecorderRef.current.onstop = async () => {
            try {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                console.log("Audio blob size:", audioBlob.size);
                
        const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.wav');

                setLoading(true);
                console.log("Sending audio for transcription...");
                
                const transcribeResponse = await api.transcribeAudio(formData);
                console.log("Transcription response:", transcribeResponse);
                
                if (transcribeResponse.success && transcribeResponse.transcript) {
                    setOriginalTranscript(transcribeResponse.transcript);
                    
                    try {
                        // Generate repair table from transcript
                        const tableResponse = await api.generateTable({
                            transcript: transcribeResponse.transcript
                        });
                        
                        console.log("Table response:", tableResponse);  // Debug log
                        
                        if (tableResponse.success) {
                            setRepairDetails(tableResponse.repair_table.repairs);
                            setAdditionalInfo(tableResponse.other_content || '');
                        } else {
                            throw new Error(tableResponse.error || 'Failed to generate repair table');
                        }
                    } catch (tableErr) {
                        console.error('Error generating repair table:', tableErr);
                        setError('Error generating repair table: ' + tableErr.message);
                    }
                } else {
                    throw new Error(transcribeResponse.error || 'Failed to transcribe audio');
                }
            } catch (err) {
                console.error('Error processing audio:', err);
                setError('Error processing audio: ' + (err.response?.data?.error || err.message));
            } finally {
                setLoading(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
        setError('');
    } catch (err) {
        console.error('Error starting recording:', err);
        setError('Error accessing microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const translateText = async (text) => {
    if (!text.trim()) return;
    
    setIsTranslating(true);
    try {
      console.log('Manually translating:', text.trim()); // Debug log
      const response = await axios.post(`${API_URL}/api/translate`, {
        text: text.trim()
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Manual translation response:', response.data); // Debug log
      
      if (response.data && response.data.translated_text) {
        setTranscript(response.data.translated_text);
        generateRepairList(response.data.translated_text);
      }
    } catch (error) {
      console.error('Translation error:', error.response || error);
      setTranscript(text);
      alert('Error translating text. Please try again.');
    }
    setIsTranslating(false);
  };

  const generateRepairList = async (transcript) => {
    try {
        const response = await api.generateTable({ transcript });
        if (response.success) {
            setRepairList(response.repair_table.repairs);
        } else {
            throw new Error(response.error || 'Failed to generate repair table');
        }
    } catch (error) {
        console.error('Error generating repair table:', error);
        setError('Error generating repair table: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
        setError('Please enter an email address');
        return;
    }
    
    try {
        setLoading(true);
        const response = await api.sendReport({
            email: email,
            repair_details: repairDetails,
            additional_info: additionalInfo,
            service_context: precontext,
            original_transcript: originalTranscript,
            transcript: transcript
        });
        
        if (response.success) {
      alert('Report sent successfully!');
            // Reset form but keep the email and precontext
            setOriginalTranscript('');
            setTranscript('');
            setRepairDetails([]);
            setAdditionalInfo('');
            setError('');
        }
    } catch (err) {
        console.error('Error sending report:', err);
        setError('Failed to send report: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  const processAudioFile = async (audioBlob) => {
    try {
        setLoading(true);
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        // First transcribe the audio
        const transcribeResponse = await api.transcribeAudio(formData);
        setOriginalTranscript(transcribeResponse.transcript);

        // Generate repair table and get additional info
        const tableResponse = await api.generateTable({
            transcript: transcribeResponse.transcript
        });
        
        if (tableResponse.success) {
            setRepairDetails(tableResponse.repair_table.repairs);
            setAdditionalInfo(tableResponse.other_content || '');
        }

    } catch (err) {
        console.error('Error processing audio:', err);
        setError('Error processing audio: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  // Add handlers for editing repair details
  const updateRepairDetail = (index, field, value) => {
    const updatedDetails = [...repairDetails];
    updatedDetails[index] = {
        ...updatedDetails[index],
        [field]: value
    };
    setRepairDetails(updatedDetails);
  };

  const deleteRepairDetail = (index) => {
    const updatedDetails = repairDetails.filter((_, i) => i !== index);
    setRepairDetails(updatedDetails);
  };

  const generatePreview = async () => {
    try {
        const response = await api.generateEmailPreview({
            email: email,
            repair_details: repairDetails,
            additional_info: additionalInfo,
            service_context: precontext
        });
        
        if (response.success) {
            setEmailPreview(response.emailContent);
            setShowPreview(true);
        }
    } catch (err) {
        console.error('Error generating preview:', err);
        setError('Failed to generate preview: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); // Remove token from local storage
    navigate('/'); // Redirect to login page
  };

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      
      <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Service Report</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition">
          Logout
        </button>
      </div>
        
        {/* Service Context Section - KEEP THIS ONE */}
        <div className="mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Recipient Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter recipient email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Service Context:</label>
            <textarea
              value={precontext}
              onChange={(e) => setPrecontext(e.target.value)}
              className="w-full p-4 border rounded-lg"
              rows="5"
              placeholder="Enter service context, protocols followed, and general notes..."
            />
          </div>
        </div>

        {/* Voice Recording Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Voice Recording (Speak in any language)</h2>
          {/* Recording Button */}
          <button
            className={`${
              isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
            } text-white font-bold py-3 px-6 rounded-md transition-colors duration-200 flex items-center gap-2`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="animate-pulse">●</span> Processing...
              </>
            ) : (
              <>
                {isRecording ? (
                  <>
                    <span className="animate-pulse">●</span> Stop Recording
                  </>
                ) : (
                  <>
                    <span>⚫</span> Start Recording
                  </>
                )}
              </>
            )}
          </button>

          {/* Audio Playback Section */}
          {audioURL && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Recorded Audio
              </label>
              <audio 
                ref={audioRef}
                src={audioURL} 
                controls 
                className="w-full"
              />
            </div>
          )}

          {/* Real-time Speech Display */}
          <div className="mt-4 space-y-4">
            {/* Current Word Display */}
            {isListening && (
              <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Currently Speaking
                </label>
                <div className="flex items-center gap-2">
                  <span className="animate-pulse text-blue-500">●</span>
                  <p className="text-blue-600 text-lg font-medium">
                    {currentWord || 'Listening...'}
                  </p>
                </div>
              </div>
            )}

            {/* Original Speech */}
            {originalTranscript && (
              <div className="space-y-2 mt-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Original Speech
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="3"
                  value={originalTranscript}
                  readOnly
                />
              </div>
            )}

            {/* English Translation */}
            {transcript && (
              <div className="space-y-2 mt-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  English Translation
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="3"
                  value={transcript}
                  readOnly
                />
              </div>
            )}

            {/* Audio Recording */}
            {audioURL && (
              <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Recorded Audio
                </label>
                <audio 
                  ref={audioRef}
                  src={audioURL} 
                  controls 
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Repair List Section */}
        <div className="space-y-2">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Repair List
          </label>
          <div className="space-y-2">
            {repairList.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-gray-500 min-w-[2rem]">{index + 1}.</span>
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={item}
                  onChange={(e) => {
                    const newList = [...repairList];
                    newList[index] = e.target.value;
                    setRepairList(newList);
                  }}
                />
                <button
                  className="text-red-500 hover:text-red-700 p-2"
                  onClick={() => {
                    const newList = repairList.filter((_, i) => i !== index);
                    setRepairList(newList);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Repair Details Section */}
        {repairDetails.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Repair Details</h2>
            <div className="space-y-4">
              {repairDetails.map((repair, index) => (
                <div key={index} className="border rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold">Issue {index + 1}</h3>
                    <button
                      onClick={() => deleteRepairDetail(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium">Description:</label>
                      <input
                        type="text"
                        value={repair.issueDescription}
                        onChange={(e) => updateRepairDetail(index, 'issueDescription', e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Required Parts:</label>
                      <input
                        type="text"
                        value={repair.requiredParts}
                        onChange={(e) => updateRepairDetail(index, 'requiredParts', e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Estimated Time:</label>
                      <input
                        type="text"
                        value={repair.estimatedTime}
                        onChange={(e) => updateRepairDetail(index, 'estimatedTime', e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Priority Level:</label>
                      <select
                        value={repair.priorityLevel}
                        onChange={(e) => updateRepairDetail(index, 'priorityLevel', e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Recommended Action:</label>
                      <textarea
                        value={repair.recommendedAction}
                        onChange={(e) => updateRepairDetail(index, 'recommendedAction', e.target.value)}
                        className="w-full p-2 border rounded"
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Information Section */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg"
            rows="4"
            placeholder="Please provide any general observations or non-repair information in English..."
          />
        </div>

        {/* Preview and Submit Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            className="flex-1 py-2 px-4 rounded-md text-white font-medium bg-blue-500 hover:bg-blue-600"
            onClick={generatePreview}
            disabled={loading}
          >
            Preview Report
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md text-white font-medium
              ${loading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Send Report'}
          </button>
        </div>

        {/* Email Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Email Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="whitespace-pre-wrap font-mono text-sm border p-4 rounded-lg bg-gray-50">
                {emailPreview}
              </div>
              <div className="flex justify-end gap-4 mt-4">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 rounded-md border hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default ServiceReport; 