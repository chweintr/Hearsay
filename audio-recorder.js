/**
 * HEARSAY Audio Recorder
 * ─────────────────────────────────────────────────────────────────────────────
 * Captures user microphone audio during Simli conversations.
 * Audio is later transcribed by Whisper for the Writing Engine.
 * 
 * The hotel hears everything. We just make sure it remembers.
 */

export class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.isRecording = false;
        
        // All recordings for this session
        this.recordings = [];
        
        // Current recording metadata
        this.currentCharacterId = null;
        this.currentCharacterName = null;
        this.recordingStartTime = null;
        
        console.log('[AudioRecorder] Initialized');
    }
    
    /**
     * Check if browser supports audio recording
     */
    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    }
    
    /**
     * Request microphone permission (call early, before needed)
     */
    async requestPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop tracks immediately - we just wanted to prompt for permission
            stream.getTracks().forEach(track => track.stop());
            console.log('[AudioRecorder] ✅ Microphone permission granted');
            return true;
        } catch (error) {
            console.error('[AudioRecorder] ❌ Microphone permission denied:', error.message);
            return false;
        }
    }
    
    /**
     * Start recording audio for a character conversation
     * @param {string} characterId - Character identifier
     * @param {string} characterName - Character display name
     */
    async start(characterId, characterName) {
        if (this.isRecording) {
            console.warn('[AudioRecorder] Already recording, stopping previous first');
            await this.stop();
        }
        
        if (!AudioRecorder.isSupported()) {
            console.error('[AudioRecorder] MediaRecorder not supported in this browser');
            return false;
        }
        
        try {
            // Get microphone stream
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000  // Whisper prefers 16kHz
                } 
            });
            
            // Determine best supported MIME type
            const mimeType = this.getSupportedMimeType();
            console.log(`[AudioRecorder] Using MIME type: ${mimeType}`);
            
            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream, { 
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });
            
            this.audioChunks = [];
            this.currentCharacterId = characterId;
            this.currentCharacterName = characterName;
            this.recordingStartTime = Date.now();
            
            // Collect audio chunks
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            // Handle errors
            this.mediaRecorder.onerror = (event) => {
                console.error('[AudioRecorder] Recording error:', event.error);
            };
            
            // Start recording - collect data every second
            this.mediaRecorder.start(1000);
            this.isRecording = true;
            
            console.log(`[AudioRecorder] 🎙️ Recording started for ${characterName}`);
            return true;
            
        } catch (error) {
            console.error('[AudioRecorder] Failed to start recording:', error);
            return false;
        }
    }
    
    /**
     * Get best supported MIME type for audio recording
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/wav'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        // Fallback - let browser choose
        return '';
    }
    
    /**
     * Stop recording and save the audio blob
     * @returns {Promise<Object>} Recording data { characterId, blob, duration, timestamp }
     */
    async stop() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('[AudioRecorder] Not currently recording');
            return null;
        }
        
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                // Create blob from chunks
                const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(this.audioChunks, { type: mimeType });
                
                const duration = Date.now() - this.recordingStartTime;
                
                const recording = {
                    characterId: this.currentCharacterId,
                    characterName: this.currentCharacterName,
                    blob: blob,
                    mimeType: mimeType,
                    duration: duration,
                    timestamp: this.recordingStartTime,
                    size: blob.size
                };
                
                // Store in recordings array
                this.recordings.push(recording);
                
                console.log(`[AudioRecorder] ✅ Recording stopped for ${this.currentCharacterName}`);
                console.log(`[AudioRecorder]    Duration: ${(duration / 1000).toFixed(1)}s`);
                console.log(`[AudioRecorder]    Size: ${(blob.size / 1024).toFixed(1)} KB`);
                
                // Cleanup
                this.audioChunks = [];
                this.isRecording = false;
                
                // Stop microphone stream
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }
                
                resolve(recording);
            };
            
            // Stop recording
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            } else {
                // Already stopped, resolve immediately
                resolve(null);
            }
        });
    }
    
    /**
     * Get all recordings from this session
     */
    getRecordings() {
        return this.recordings;
    }
    
    /**
     * Get total recording count
     */
    getRecordingCount() {
        return this.recordings.length;
    }
    
    /**
     * Get total recorded duration in milliseconds
     */
    getTotalDuration() {
        return this.recordings.reduce((total, r) => total + r.duration, 0);
    }
    
    /**
     * Upload all recordings to backend
     * @param {string} sessionId - User session ID
     * @returns {Promise<Array>} Upload results
     */
    async uploadAll(sessionId) {
        if (this.recordings.length === 0) {
            console.log('[AudioRecorder] No recordings to upload');
            return [];
        }
        
        console.log(`[AudioRecorder] 📤 Uploading ${this.recordings.length} recording(s)...`);
        
        const results = [];
        
        for (const recording of this.recordings) {
            try {
                const formData = new FormData();
                formData.append('sessionId', sessionId);
                formData.append('characterId', recording.characterId);
                formData.append('characterName', recording.characterName);
                formData.append('duration', recording.duration.toString());
                formData.append('timestamp', recording.timestamp.toString());
                
                // Determine file extension from MIME type
                const ext = recording.mimeType.includes('webm') ? 'webm' 
                          : recording.mimeType.includes('ogg') ? 'ogg'
                          : recording.mimeType.includes('mp4') ? 'm4a'
                          : 'wav';
                
                formData.append('audio', recording.blob, `${recording.characterId}_${recording.timestamp}.${ext}`);
                
                const response = await fetch('/api/upload-audio', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`Upload failed: ${response.status}`);
                }
                
                const result = await response.json();
                results.push({ 
                    characterId: recording.characterId, 
                    success: true, 
                    ...result 
                });
                
                console.log(`[AudioRecorder] ✅ Uploaded: ${recording.characterName}`);
                
            } catch (error) {
                console.error(`[AudioRecorder] ❌ Upload failed for ${recording.characterName}:`, error);
                results.push({ 
                    characterId: recording.characterId, 
                    success: false, 
                    error: error.message 
                });
            }
        }
        
        return results;
    }
    
    /**
     * Clear all recordings (after successful upload)
     */
    clearRecordings() {
        this.recordings = [];
        console.log('[AudioRecorder] Recordings cleared');
    }
    
    /**
     * Check if currently recording
     */
    isCurrentlyRecording() {
        return this.isRecording;
    }
    
    /**
     * Get current recording duration (while recording)
     */
    getCurrentDuration() {
        if (!this.isRecording || !this.recordingStartTime) {
            return 0;
        }
        return Date.now() - this.recordingStartTime;
    }
    
    /**
     * Debug: Show all recordings info
     */
    debug() {
        console.log('=== AudioRecorder Debug ===');
        console.log(`Recordings: ${this.recordings.length}`);
        console.log(`Currently recording: ${this.isRecording}`);
        console.log(`Total duration: ${(this.getTotalDuration() / 1000).toFixed(1)}s`);
        
        this.recordings.forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.characterName}: ${(r.duration / 1000).toFixed(1)}s, ${(r.size / 1024).toFixed(1)} KB`);
        });
    }
}

// Singleton instance
let audioRecorderInstance = null;

export function getAudioRecorder() {
    if (!audioRecorderInstance) {
        audioRecorderInstance = new AudioRecorder();
    }
    return audioRecorderInstance;
}

