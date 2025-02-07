import React, { useState, useRef } from 'react';
import { api } from '../services/api';

const RepairForm = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [serviceContext, setServiceContext] = useState('');
    const [transcript, setTranscript] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [repairList, setRepairList] = useState([]);
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await processAudioFile(audioBlob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setError('');
        } catch (err) {
            setError('Error accessing microphone: ' + err.message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processAudioFile = async (audioBlob) => {
        try {
            setLoading(true);
            
            // First, transcribe the audio
            const transcribeResult = await api.transcribeAudio(audioBlob);
            setTranscript(transcribeResult.transcript);
            
            // Generate repair list from transcript
            const repairListResult = await api.generateRepairList({ text: transcribeResult.transcript });
            setRepairList(repairListResult.repair_list || []);

            // Translate the transcript
            const translateResult = await api.translate({ text: transcribeResult.transcript });
            setTranslatedText(translateResult.translated_text);

        } catch (err) {
            setError('Error processing audio: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            const result = await api.sendReport({
                email: serviceContext,
                repair_list: repairList,
                other_info: additionalInfo
            });
            
            setSuccess('Report sent successfully!');
            // Reset form
            setServiceContext('');
            setTranscript('');
            setTranslatedText('');
            setRepairList([]);
            setAdditionalInfo('');
        } catch (err) {
            setError('Error sending report: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
           
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-2">Service Context</label>
                    <textarea
                        value={serviceContext}
                        onChange={(e) => setServiceContext(e.target.value)}
                        className="w-full p-2 border rounded h-24"
                        placeholder="Enter service context..."
                    />
                </div>

                <div>
                    <label className="block mb-2">Voice Recording (Speak in any language)</label>
                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-full p-2 text-white rounded ${
                            isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                    >
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                </div>

                {transcript && (
                    <div>
                        <label className="block mb-2">Original Speech</label>
                        <textarea
                            value={transcript}
                            readOnly
                            className="w-full p-2 border rounded h-32"
                        />
                    </div>
                )}

                {translatedText && (
                    <div>
                        <label className="block mb-2">English Translation</label>
                        <textarea
                            value={translatedText}
                            readOnly
                            className="w-full p-2 border rounded h-32"
                        />
                    </div>
                )}

                {repairList.length > 0 && (
                    <div>
                        <label className="block mb-2">Repair List</label>
                        <div className="border rounded p-4">
                            <ul className="list-disc pl-4">
                                {repairList.map((item, index) => (
                                    <li key={index} className="mb-2">{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block mb-2">Additional Information</label>
                    <textarea
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                        className="w-full p-2 border rounded h-32"
                        placeholder="Enter any additional information..."
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !repairList.length}
                    className={`w-full p-2 text-white rounded ${
                        loading || !repairList.length
                            ? 'bg-gray-400'
                            : 'bg-green-500 hover:bg-green-600'
                    }`}
                >
                    {loading ? 'Processing...' : 'Submit Report'}
                </button>
            </form>
        </div>
    );
};

export default RepairForm; 