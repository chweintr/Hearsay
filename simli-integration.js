/**
 * HEARSAY Simli Integration
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the Simli widget lifecycle:
 *   - Fetch session token from backend
 *   - Create <simli-widget> element dynamically
 *   - Detect when video stream is ready
 *   - Destroy widget when visitor leaves
 * 
 * The visitor is at your door. You speak. They respond.
 */

import { BlackRemover } from './black-remover.js';
import { getSessionManager } from './session-manager.js';
import { getAudioRecorder } from './audio-recorder.js';

export class SimliIntegration {
    constructor(stateMachine, config) {
        this.stateMachine = stateMachine;
        this.config = config;
        this.widget = null;
        this.mountPoint = document.getElementById('simli-mount');
        this.blackRemover = new BlackRemover();
        
        // Session manager for user session tracking (persists across conversations)
        this.sessionManager = getSessionManager();
        
        // Audio recorder for Whisper transcription
        this.audioRecorder = getAudioRecorder();
        
        // Simli session tracking (per-conversation)
        this.currentSimliSessionId = null;
        this.currentCharacter = null;
        
        // LOCAL transcript capture (doesn't rely on Simli API)
        // This is the primary source - Simli's transcript API is unreliable
        this.localTranscript = [];
        
        // Bind handlers
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleTransitionEnd = this.handleTransitionEnd.bind(this);
        
        // Subscribe to state machine
        stateMachine.on('stateChange', this.handleStateChange);
        stateMachine.on('transitionEnd', this.handleTransitionEnd);
        
        // Global listener for ALL custom events (debug)
        window.addEventListener('message', (e) => {
            if (e.data && typeof e.data === 'object') {
                console.log('[Simli] Window message:', e.data);
            }
        });
        
        // Check microphone permissions
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => console.log('[Simli] 🎤 Microphone access granted'))
            .catch(err => console.error('[Simli] ❌ Microphone denied:', err.message));
        
        console.log('[Simli] Integration initialized');
    }

    /**
     * React to state changes
     */
    handleStateChange({ from, to, character }) {
        if (to === 'transitioning-out') {
            // Start cleanup during departure transition
            this.destroyWidget();
        }
    }

    /**
     * Handle transition completion
     */
    handleTransitionEnd({ type, character }) {
        console.log(`[Simli] TransitionEnd received: type=${type}, character=${character?.name}`);
        if (type === 'in') {
            // Character has arrived, create widget
            console.log('[Simli] Creating widget for', character?.name);
            this.createWidget(character);
        }
    }

    /**
     * Add entry to local transcript
     * Called by event listeners on the Simli widget
     */
    addToTranscript(speaker, text) {
        if (!text || text.trim() === '') return;
        
        const entry = {
            speaker: speaker,  // 'user' or 'ai'
            text: text.trim(),
            timestamp: new Date().toISOString()
        };
        
        this.localTranscript.push(entry);
        console.log(`[Simli] 📝 Transcript: ${speaker}: ${text.substring(0, 50)}...`);
    }
    
    /**
     * Get local transcript for current conversation
     */
    getLocalTranscript() {
        return this.localTranscript;
    }
    
    /**
     * Clear local transcript (called at start of new conversation)
     */
    clearLocalTranscript() {
        this.localTranscript = [];
    }
    
    /**
     * Fetch session token from Railway backend
     * @param {string} agentId - Simli agent ID
     * @param {string} faceId - Simli face ID
     * @returns {Promise<{token: string, sessionId: string}>} Session token and ID
     */
    async fetchToken(agentId, faceId) {
        try {
            const response = await fetch(
                `${this.config.tokenEndpoint}?agentId=${agentId}&faceId=${faceId}`,
                { method: 'POST' }
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Token fetch failed: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('[Simli] Token response:', JSON.stringify(data));
            
            // Store Simli session ID for transcript retrieval later
            if (data.sessionId) {
                this.currentSimliSessionId = data.sessionId;
                console.log(`[Simli] 📋 Simli Session ID saved: ${this.currentSimliSessionId}`);
            }
            
            if (!data.token) {
                console.error('[Simli] ❌ No token in response!', data);
            }
            
            return { token: data.token, sessionId: data.sessionId };
            
        } catch (error) {
            console.error('[Simli] Token fetch error:', error);
            throw error;
        }
    }
    
    /**
     * Retrieve transcript for completed session
     * Call this after the conversation ends (triggered by widget destroy)
     * @param {string} sessionId - Session ID from token creation
     * @returns {Promise<Object>} Transcript data
     */
    async fetchTranscript(sessionId) {
        const sid = sessionId || this.currentSimliSessionId;
        if (!sid) {
            console.warn('[Simli] No session ID available for transcript');
            return null;
        }
        
        console.log(`[Simli] 📜 Fetching transcript for session: ${sid}`);
        
        try {
            const response = await fetch(`/api/simli-transcript/${sid}`);
            const data = await response.json();
            
            if (data.status === 'pending') {
                console.log('[Simli] Transcript not ready yet, retrying in 3s...');
                // Retry after delay
                await new Promise(resolve => setTimeout(resolve, 3000));
                return this.fetchTranscript(sid);
            }
            
            if (data.status === 'complete') {
                console.log('[Simli] ✅ Transcript retrieved!', data);
                
                // Dispatch event for other parts of the app
                window.dispatchEvent(new CustomEvent('hearsay-transcript', {
                    detail: {
                        sessionId: sid,
                        character: this.currentCharacter?.name,
                        transcript: data.transcript
                    }
                }));
                
                return data;
            }
            
            console.warn('[Simli] Unexpected transcript response:', data);
            return data;
            
        } catch (error) {
            console.error('[Simli] Transcript fetch error:', error);
            return null;
        }
    }

    /**
     * Create and mount Simli widget
     * @param {Object} character - Character config
     */
    async createWidget(character) {
        console.log('[Simli] createWidget called with:', character);
        
        if (this.widget) {
            console.warn('[Simli] Widget exists, destroying first');
            this.destroyWidget();
        }

        try {
            console.log(`[Simli] Creating widget for ${character.name}...`);
            console.log(`[Simli] Agent ID: ${character.agentId}, Face ID: ${character.faceId}`);
            
            // Store current character for transcript metadata
            this.currentCharacter = character;
            
            // Clear local transcript for new conversation
            this.clearLocalTranscript();
            console.log('[Simli] 📝 Local transcript capture ready');
            
            // Record conversation START immediately (don't wait for transcript)
            // This ensures "End Session" knows a conversation happened
            this.sessionManager.recordConversationStart(character);
            
            // Start audio recording for Whisper transcription
            // This captures user's microphone - the hotel hears everything
            const recordingStarted = await this.audioRecorder.start(character.id, character.name);
            if (recordingStarted) {
                console.log(`[Simli] 🎙️ Audio recording started for ${character.name}`);
            } else {
                console.warn('[Simli] ⚠️ Audio recording failed to start - transcript will rely on Simli API');
            }
            
            // Show loading state
            document.body.classList.add('loading');
            
            // Fetch session token from backend
            console.log('[Simli] Fetching token...');
            const { token, sessionId } = await this.fetchToken(character.agentId, character.faceId);
            console.log('[Simli] Token received:', token ? 'yes' : 'no');
            console.log('[Simli] Session ID:', sessionId || 'none');
            
            // Create widget element
            this.widget = document.createElement('simli-widget');
            
            // Set token - try multiple attribute names
            console.log('[Simli] Setting token on widget:', token?.substring(0, 50) + '...');
            this.widget.setAttribute('token', token);
            this.widget.setAttribute('session-token', token);
            this.widget.setAttribute('sessionToken', token);
            this.widget.token = token;
            this.widget.sessionToken = token;
            
            // CRITICAL: Use transparent image to replace dotted face placeholder
            // This is the official Simli way to hide the loading dots
            this.widget.setAttribute('customimage', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
            
            // Set ALL attribute formats (Simli is inconsistent)
            this.widget.setAttribute('agentid', character.agentId);
            this.widget.setAttribute('agent-id', character.agentId);
            this.widget.setAttribute('agentId', character.agentId);
            this.widget.setAttribute('faceid', character.faceId);
            this.widget.setAttribute('face-id', character.faceId);
            this.widget.setAttribute('faceId', character.faceId);
            
            // Also set as direct properties
            this.widget.agentId = character.agentId;
            this.widget.faceId = character.faceId;
            
            console.log('[Simli] Widget attributes set:', {
                token: this.widget.getAttribute('token')?.substring(0, 30) + '...',
                agentId: this.widget.getAttribute('agentid'),
                faceId: this.widget.getAttribute('faceid')
            });
            
            // Widget event listeners - log everything for debugging
            this.widget.addEventListener('simli-ready', () => {
                console.log(`[Simli] ✅ ${character.name} is ready to speak`);
                document.body.classList.remove('loading');
            });
            
            this.widget.addEventListener('simli-error', (e) => {
                console.error('[Simli] ❌ Widget error:', e.detail);
                document.body.classList.remove('loading');
                this.handleWidgetError(e.detail);
            });
            
            this.widget.addEventListener('simli-ended', () => {
                console.log('[Simli] Session ended by server');
            });
            
            // Additional debug listeners
            this.widget.addEventListener('simli-connected', () => {
                console.log('[Simli] 🔗 Connected to call');
            });
            
            this.widget.addEventListener('simli-speaking', () => {
                console.log('[Simli] 🗣️ Speaking started');
            });
            
            this.widget.addEventListener('simli-listening', () => {
                console.log('[Simli] 👂 Listening for user speech');
            });
            
            // LOCAL TRANSCRIPT CAPTURE - Listen for transcription events
            // These event names may vary - Simli docs are sparse
            // We try multiple possible event names
            
            // User speech transcription
            ['transcription', 'user-transcription', 'speech-result', 'transcript', 'user-speech'].forEach(eventName => {
                this.widget.addEventListener(eventName, (e) => {
                    console.log(`[Simli] 📥 Event '${eventName}':`, e.detail);
                    const text = e.detail?.text || e.detail?.transcript || e.detail?.message || '';
                    if (text) {
                        this.addToTranscript('user', text);
                    }
                });
            });
            
            // AI response transcription
            ['ai-response', 'agent-response', 'assistant-message', 'response', 'ai-text'].forEach(eventName => {
                this.widget.addEventListener(eventName, (e) => {
                    console.log(`[Simli] 📤 Event '${eventName}':`, e.detail);
                    const text = e.detail?.text || e.detail?.message || e.detail?.response || '';
                    if (text) {
                        this.addToTranscript('ai', text);
                    }
                });
            });
            
            // Catch-all: Log ALL events for debugging
            const logAllEvents = (eventName) => {
                this.widget.addEventListener(eventName, (e) => {
                    if (e.detail && typeof e.detail === 'object') {
                        console.log(`[Simli] EVENT '${eventName}':`, JSON.stringify(e.detail).substring(0, 200));
                    }
                });
            };
            
            // Common event names to watch
            ['message', 'data', 'update', 'text', 'speech', 'audio'].forEach(logAllEvents);
            
            // Catch ALL events on the widget for debugging
            const originalAddEventListener = this.widget.addEventListener.bind(this.widget);
            this.widget.addEventListener = (type, listener, options) => {
                console.log(`[Simli] Event listener added: ${type}`);
                return originalAddEventListener(type, listener, options);
            };
            
            // Log any dispatched events
            ['click', 'change', 'input'].forEach(eventType => {
                this.widget.addEventListener(eventType, (e) => {
                    console.log(`[Simli] Event: ${eventType}`, e.target);
                });
            });
            
            // Mount widget
            this.mountPoint.appendChild(this.widget);
            console.log(`[Simli] ${character.name} mounted`);
            
            // Inject transparent styles into Shadow DOM when it appears
            const waitForShadowDOM = setInterval(() => {
                if (this.widget.shadowRoot) {
                    this.injectShadowStyles(this.widget.shadowRoot);
                    clearInterval(waitForShadowDOM);
                }
            }, 100);
            setTimeout(() => clearInterval(waitForShadowDOM), 5000);
            
            // DON'T destroy walkup immediately - wait for Simli video to be playing
            // The walkup video keeps showing until Simli is ready
            console.log('[Simli] Walkup video continues while waiting for Simli stream...');
            
            // Watch for video element to appear, then start black removal
            // This also handles hiding the walkup when Simli is ready
            this.watchForVideo();
            
            // Aggressively hide dotted face loading animation
            this.hideSimliLoadingUI();
            
            // Auto-click Start/Connect buttons in the widget (per Simli docs)
            const clickWidgetButtons = () => {
                console.log('[Simli] Looking for Start/Connect buttons to click...');
                
                const findAndClickButtons = (root) => {
                    if (!root) return;
                    
                    // Check shadow DOM
                    if (root.shadowRoot) {
                        findAndClickButtons(root.shadowRoot);
                    }
                    
                    // Find all buttons
                    const buttons = root.querySelectorAll('button');
                    buttons.forEach(btn => {
                        const text = (btn.textContent || '').toLowerCase();
                        console.log(`[Simli] Found button: "${text}"`);
                        
                        // Click Connect or Start buttons, skip Close/End
                        if (text.includes('connect') || text.includes('start')) {
                            console.log('[Simli] 🖱️ Clicking:', text);
                            btn.click();
                        }
                    });
                    
                    // Check children with shadow roots
                    root.querySelectorAll('*').forEach(el => {
                        if (el.shadowRoot) {
                            findAndClickButtons(el.shadowRoot);
                        }
                    });
                };
                
                if (this.widget) {
                    findAndClickButtons(this.widget);
                }
            };
            
            // Try to start session - only once!
            let sessionStarted = false;
            const tryStartSession = () => {
                if (!this.widget || sessionStarted) return;
                
                // Method 1: Direct API call
                if (typeof this.widget.startSession === 'function') {
                    console.log('[Simli] ✅ Calling widget.startSession()');
                    this.widget.startSession();
                    sessionStarted = true;
                    return;
                }
                
                // Method 2: Click buttons (fallback)
                clickWidgetButtons();
            };
            
            // Auto-start after widget loads - single attempt with fallback
            setTimeout(tryStartSession, 800);
            
        } catch (error) {
            console.error('[Simli] Widget creation failed:', error);
            document.body.classList.remove('loading');
            this.handleWidgetError(error);
        }
    }

    /**
     * DEPRECATED - now handled by BlackRemover.onReady callback in watchForVideo()
     */
    hideTransitionWhenVideoReady() {
        // This was causing the walkup to flash and disappear
        // Now handled by the canvas frame callback instead
        console.log('[Simli] hideTransitionWhenVideoReady is deprecated - using canvas callback');
    }

    /**
     * Inject transparent background styles into Shadow DOM
     */
    injectShadowStyles(shadowRoot) {
        if (!shadowRoot) return;
        
        const style = document.createElement('style');
        style.textContent = `
            /* Force ALL elements transparent */
            *, *::before, *::after {
                background: transparent !important;
                background-color: transparent !important;
            }
            
            /* Hide the dotted face placeholder completely */
            svg, [class*="avatar"], [class*="placeholder"], [class*="loading"], [class*="dots"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
            
            /* The video should be hidden - canvas shows the processed frames */
            video {
                opacity: 0 !important;
                visibility: hidden !important;
            }
            
            /* CRITICAL: Ensure audio element is NOT hidden */
            audio {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
        `;
        shadowRoot.appendChild(style);
        console.log('[Simli] Injected transparent styles into Shadow DOM (audio preserved)');
    }

    /**
     * Hide Simli's dotted face loading animation
     * Uses video 'playing' event as trigger
     */
    hideSimliLoadingUI() {
        const hidePlaceholders = (root) => {
            if (!root) return;
            
            // Inject styles if this is a shadow root
            if (root.host) {
                this.injectShadowStyles(root);
            }
            
            // Hide SVGs and non-video siblings
            root.querySelectorAll('svg, canvas, [class*="avatar"], [class*="placeholder"]').forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.remove(); // Actually remove it
            });
            
            // Force transparent on all elements
            root.querySelectorAll('*').forEach(el => {
                el.style.background = 'transparent';
                el.style.backgroundColor = 'transparent';
            });
            
            // Find video and hide its sibling containers - BUT PRESERVE AUDIO!
            const video = root.querySelector('video');
            const audio = root.querySelector('audio');
            if (video && video.parentElement && video.parentElement.parentElement) {
                Array.from(video.parentElement.parentElement.children).forEach(child => {
                    // Don't hide if it contains video OR audio
                    const containsVideo = child.contains(video);
                    const containsAudio = audio && child.contains(audio);
                    if (!containsVideo && !containsAudio) {
                        child.style.display = 'none';
                    }
                });
            }
            
            // Ensure audio element is visible and not muted
            if (audio) {
                audio.style.display = 'block';
                audio.muted = false;
                audio.volume = 1.0;
                console.log('[Simli] 🔊 Audio element found and preserved');
            }
            
            // Check shadow roots recursively
            if (root.shadowRoot) {
                hidePlaceholders(root.shadowRoot);
            }
            root.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                    hidePlaceholders(el.shadowRoot);
                }
            });
        };
        
        // Poll for video to be playing
        const checkInterval = setInterval(() => {
            if (!this.widget) {
                clearInterval(checkInterval);
                return;
            }
            
            const video = this.widget.querySelector('video') || 
                          this.widget.shadowRoot?.querySelector('video');
            
            if (video && video.readyState >= 2) {
                console.log('[Simli] Video ready, hiding placeholders');
                hidePlaceholders(this.widget);
                
                // Also listen for playing event
                video.addEventListener('playing', () => {
                    console.log('[Simli] Video playing, ensuring placeholders hidden');
                    hidePlaceholders(this.widget);
                });
                
                clearInterval(checkInterval);
            }
        }, 200);
        
        // Timeout after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
        
        console.log('[Simli] Monitoring for video ready state');
    }

    /**
     * Watch for Simli video element and start black removal
     */
    watchForVideo() {
        console.log('[Simli] Watching for video element...');
        
        const checkForVideo = () => {
            if (!this.widget) return;
            
            // Look for video in widget, shadow DOM, iframes
            let video = this.widget.querySelector('video');
            
            // Check shadow DOM
            if (!video && this.widget.shadowRoot) {
                video = this.widget.shadowRoot.querySelector('video');
            }
            
            // Check nested elements with shadow roots
            if (!video) {
                this.widget.querySelectorAll('*').forEach(el => {
                    if (!video && el.shadowRoot) {
                        video = el.shadowRoot.querySelector('video');
                    }
                });
            }
            
            if (video && video.videoWidth > 0) {
                // Log the NATIVE dimensions from Simli
                console.log(`[Simli] 📐 Native video dimensions: ${video.videoWidth}x${video.videoHeight}`);
                console.log(`[Simli] 📐 Aspect ratio: ${(video.videoWidth / video.videoHeight).toFixed(2)}`);
                
                console.log('[Simli] 🎬 Video found, starting black removal');
                
                // Set callback to hide walkup ONLY when canvas has rendered frames
                this.blackRemover.setOnReady(() => {
                    console.log('[Simli] Canvas ready - now hiding walkup');
                    const transitionLayer = document.getElementById('layer-transition');
                    const transitionVideo = document.getElementById('video-transition');
                    if (transitionVideo) {
                        transitionVideo.pause();
                        transitionVideo.src = '';
                        console.log('[Simli] ✅ Walkup video stopped - Simli taking over');
                    }
                    if (transitionLayer) {
                        transitionLayer.style.display = 'none';
                        transitionLayer.classList.add('hidden');
                        console.log('[Simli] ✅ Walkup layer hidden');
                    }
                });
                
                // Configure chroma key based on character settings
                // Some characters use green screen (#00ff00), most use black
                if (this.currentCharacter?.chromaKey) {
                    this.blackRemover.setChromaKey(this.currentCharacter.chromaKey);
                } else {
                    this.blackRemover.setChromaKey('black');
                }
                
                // Start BlackRemover - it will call onReady when canvas is rendering
                this.blackRemover.start(video);
                console.log('[Simli] BlackRemover started, waiting for canvas frames...');
            } else {
                // Keep checking
                setTimeout(checkForVideo, 500);
            }
        };
        
        // Start checking after a delay
        setTimeout(checkForVideo, 1000);
    }

    /**
     * Destroy and unmount widget
     */
    async destroyWidget() {
        if (!this.widget) return;

        console.log('[Simli] Destroying widget...');
        
        // Stop black removal
        this.blackRemover.stop();
        
        // Stop audio recording FIRST (before any cleanup)
        if (this.audioRecorder.isCurrentlyRecording()) {
            const recording = await this.audioRecorder.stop();
            if (recording) {
                console.log(`[Simli] 🎙️ Audio recording saved: ${(recording.size / 1024).toFixed(1)} KB`);
            }
        }
        
        // Save Simli session ID before cleanup
        const simliSessionId = this.currentSimliSessionId;
        const character = this.currentCharacter;
        
        try {
            // Call widget's cleanup method if available
            if (typeof this.widget.destroy === 'function') {
                this.widget.destroy();
            }
            
            // Remove from DOM
            this.widget.remove();
            this.widget = null;
            
            console.log('[Simli] Widget destroyed');
            
        } catch (error) {
            console.error('[Simli] Destroy error:', error);
            // Force remove anyway
            this.widget?.remove();
            this.widget = null;
        }
        
        // PRIMARY: Use local transcript (captured from widget events)
        const localTranscript = [...this.localTranscript];  // Copy before clearing
        
        if (localTranscript.length > 0) {
            console.log(`[Simli] ✅ LOCAL transcript has ${localTranscript.length} entries`);
            
            // Store local transcript immediately
            this.sessionManager.storeConversation(
                simliSessionId || `local-${Date.now()}`,
                character,
                { messages: localTranscript, source: 'local' }
            );
        } else {
            console.log('[Simli] ⚠️ Local transcript is empty - trying Simli API as fallback');
            
            // FALLBACK: Try Simli's transcript API (often fails or returns empty)
            if (simliSessionId) {
                console.log(`[Simli] 📜 Will fetch transcript from Simli API in 5s...`);
                setTimeout(async () => {
                    const transcript = await this.fetchTranscript(simliSessionId);
                    if (transcript?.transcript) {
                        console.log('[Simli] Simli API transcript saved:', transcript);
                        this.sessionManager.storeConversation(simliSessionId, character, transcript.transcript);
                    } else {
                        // Store placeholder so we know conversation happened
                        console.log('[Simli] ❌ No transcript available - storing placeholder');
                        this.sessionManager.storeConversation(
                            simliSessionId || `empty-${Date.now()}`,
                            character,
                            { messages: [], source: 'none', note: 'Transcript not captured' }
                        );
                    }
                }, 5000);
            } else {
                console.warn('[Simli] ⚠️ No sessionId available - cannot fetch Simli transcript');
                // Still store that a conversation happened
                this.sessionManager.storeConversation(
                    `nosession-${Date.now()}`,
                    character,
                    { messages: [], source: 'none', note: 'No session ID available' }
                );
            }
        }
        
        // Clear Simli session tracking (user session persists)
        this.currentSimliSessionId = null;
        this.currentCharacter = null;
    }
    
    /**
     * Get session manager (for external access to session data)
     */
    getSessionManager() {
        return this.sessionManager;
    }
    
    /**
     * Get audio recorder (for external access to recordings)
     */
    getAudioRecorder() {
        return this.audioRecorder;
    }

    /**
     * Handle widget errors gracefully
     */
    handleWidgetError(error) {
        console.error('[Simli] Error, resetting:', error);
        
        // Clean up
        this.destroyWidget();
        
        // Reset to idle state
        this.stateMachine.reset();
    }

    /**
     * Check if widget is currently active
     */
    isActive() {
        return this.widget !== null;
    }
}

