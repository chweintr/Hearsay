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

export class SimliIntegration {
    constructor(stateMachine, config) {
        this.stateMachine = stateMachine;
        this.config = config;
        this.widget = null;
        this.mountPoint = document.getElementById('simli-mount');
        this.blackRemover = new BlackRemover();
        
        // Session tracking for transcripts
        this.currentSessionId = null;
        this.currentCharacter = null;
        
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
            
            // Store sessionId for transcript retrieval later
            if (data.sessionId) {
                this.currentSessionId = data.sessionId;
                console.log(`[Simli] 📋 Session ID saved: ${this.currentSessionId}`);
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
        const sid = sessionId || this.currentSessionId;
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
            
            // Call startSession() directly on the widget instead of clicking buttons
            const tryStartSession = () => {
                if (this.widget && typeof this.widget.startSession === 'function') {
                    console.log('[Simli] ✅ Calling widget.startSession() directly');
                    this.widget.startSession();
                    return true;
                } else {
                    console.log('[Simli] Widget or startSession not ready yet...');
                    return false;
                }
            };
            
            // Try to start session with retries
            const startWithRetry = (attempts = 0) => {
                if (attempts > 10) {
                    console.error('[Simli] Failed to start session after 10 attempts');
                    return;
                }
                
                if (!tryStartSession()) {
                    // Retry with increasing delay
                    setTimeout(() => startWithRetry(attempts + 1), 500 + (attempts * 200));
                }
            };
            
            // Start after widget has had time to initialize
            setTimeout(() => startWithRetry(), 800);
            
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
        `;
        shadowRoot.appendChild(style);
        console.log('[Simli] Injected transparent styles into Shadow DOM');
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
            
            // Find video and hide its sibling containers
            const video = root.querySelector('video');
            if (video && video.parentElement && video.parentElement.parentElement) {
                Array.from(video.parentElement.parentElement.children).forEach(child => {
                    if (!child.contains(video)) {
                        child.style.display = 'none';
                    }
                });
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
    destroyWidget() {
        if (!this.widget) return;

        console.log('[Simli] Destroying widget...');
        
        // Stop black removal
        this.blackRemover.stop();
        
        // Save session ID before cleanup
        const sessionId = this.currentSessionId;
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
        
        // Fetch transcript after session ends (async, with delay to let Simli process)
        if (sessionId) {
            console.log(`[Simli] 📜 Will fetch transcript for ${character?.name} session in 5s...`);
            setTimeout(async () => {
                const transcript = await this.fetchTranscript(sessionId);
                if (transcript) {
                    console.log('[Simli] Transcript saved for Writing Engine:', transcript);
                    // TODO: Store transcript in local storage or send to backend
                    this.storeTranscript(sessionId, character, transcript);
                }
            }, 5000);
        }
        
        // Clear session tracking
        this.currentSessionId = null;
        this.currentCharacter = null;
    }
    
    /**
     * Store transcript for later retrieval by Writing Engine
     * For now, stores in localStorage. Can be upgraded to backend storage.
     */
    storeTranscript(sessionId, character, transcriptData) {
        try {
            const key = `hearsay_transcript_${sessionId}`;
            const record = {
                sessionId,
                character: character?.name || 'Unknown',
                characterId: character?.id || null,
                timestamp: new Date().toISOString(),
                transcript: transcriptData.transcript
            };
            
            localStorage.setItem(key, JSON.stringify(record));
            
            // Also maintain an index of all transcripts
            const indexKey = 'hearsay_transcript_index';
            const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
            index.push({
                sessionId,
                character: character?.name,
                timestamp: record.timestamp
            });
            localStorage.setItem(indexKey, JSON.stringify(index));
            
            console.log(`[Simli] 💾 Transcript stored: ${key}`);
            
        } catch (error) {
            console.error('[Simli] Error storing transcript:', error);
        }
    }
    
    /**
     * Get all stored transcripts
     * @returns {Array} Array of transcript records
     */
    getAllTranscripts() {
        try {
            const indexKey = 'hearsay_transcript_index';
            const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
            
            return index.map(item => {
                const key = `hearsay_transcript_${item.sessionId}`;
                return JSON.parse(localStorage.getItem(key) || 'null');
            }).filter(Boolean);
            
        } catch (error) {
            console.error('[Simli] Error retrieving transcripts:', error);
            return [];
        }
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

