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
     * @returns {Promise<string>} Session token
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
            return data.token;
            
        } catch (error) {
            console.error('[Simli] Token fetch error:', error);
            throw error;
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
            
            // Show loading state
            document.body.classList.add('loading');
            
            // Fetch session token from backend
            console.log('[Simli] Fetching token...');
            const token = await this.fetchToken(character.agentId, character.faceId);
            console.log('[Simli] Token received:', token ? 'yes' : 'no');
            
            // Create widget element
            this.widget = document.createElement('simli-widget');
            
            // Set token
            this.widget.setAttribute('token', token);
            
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
            
            // FORCE hide the walkup/transition layer
            const transitionLayer = document.getElementById('layer-transition');
            if (transitionLayer) {
                transitionLayer.classList.add('hidden');
                transitionLayer.style.display = 'none';
                console.log('[Simli] Forced transition layer hidden');
            }
            
            // Watch for video element to appear, then start black removal
            this.watchForVideo();
            
            // Aggressively hide dotted face loading animation
            this.hideSimliLoadingUI();
            
            // Auto-click Simli's Connect/Start button after it loads
            const clickStartButton = () => {
                console.log('[Simli] Looking for Connect/Start button...');
                
                // Try to find buttons everywhere - widget, shadow DOM, iframes
                const findAndClickButtons = (root, depth = 0) => {
                    if (!root || depth > 3) return;
                    
                    // Find all buttons and clickable elements
                    const buttons = root.querySelectorAll('button, [role="button"], .btn, [onclick]');
                    console.log(`[Simli] Found ${buttons.length} clickables at depth ${depth}`);
                    
                    buttons.forEach(btn => {
                        const text = (btn.textContent || btn.innerText || '').toLowerCase().trim();
                        const className = (btn.className || '').toLowerCase();
                        console.log(`[Simli] Button: "${text}" class="${className}"`);
                        
                        // DON'T click close/end/leave buttons!
                        if (text.includes('close') || text.includes('end') || 
                            text.includes('leave') || text.includes('disconnect') ||
                            text.includes('stop') || className.includes('close') ||
                            className.includes('active')) {
                            console.log('[Simli] Skipping close/end button');
                            return;
                        }
                        
                        // DON'T click if already connecting
                        if (text.includes('connecting')) {
                            console.log('[Simli] Already connecting, skipping');
                            return;
                        }
                        
                        // Click buttons that look like start/connect buttons
                        if (text.includes('start') || text.includes('connect') || 
                            text.includes('begin') || text.includes('call') ||
                            className.includes('start') || className.includes('connect')) {
                            console.log('[Simli] Clicking start/connect button!');
                            btn.click();
                        }
                    });
                    
                    // Check shadow DOM
                    if (root.shadowRoot) {
                        findAndClickButtons(root.shadowRoot, depth + 1);
                    }
                    
                    // Check child elements with shadow roots
                    root.querySelectorAll('*').forEach(el => {
                        if (el.shadowRoot) {
                            findAndClickButtons(el.shadowRoot, depth + 1);
                        }
                    });
                    
                    // Check iframes
                    root.querySelectorAll('iframe').forEach(iframe => {
                        try {
                            if (iframe.contentDocument) {
                                findAndClickButtons(iframe.contentDocument, depth + 1);
                            }
                        } catch (e) {
                            // Cross-origin iframe, can't access
                        }
                    });
                };
                
                findAndClickButtons(this.widget);
            };
            
            // Try multiple times with increasing delays
            setTimeout(clickStartButton, 800);
            setTimeout(clickStartButton, 2000);
            setTimeout(clickStartButton, 4000);
            setTimeout(clickStartButton, 6000);
            
        } catch (error) {
            console.error('[Simli] Widget creation failed:', error);
            document.body.classList.remove('loading');
            this.handleWidgetError(error);
        }
    }

    /**
     * Aggressively REMOVE Simli's dotted face loading animation
     * This searches Shadow DOM and REMOVES elements entirely
     */
    hideSimliLoadingUI() {
        const removeElements = (root, depth = 0) => {
            if (!root || depth > 5) return;
            
            // Find and REMOVE all SVGs, canvases that aren't our black remover
            const selectors = 'svg, canvas:not(#simli-canvas), [class*="loading"], [class*="dots"], [class*="avatar"], [class*="placeholder"], [class*="face"], [class*="outline"]';
            
            root.querySelectorAll(selectors).forEach(el => {
                // Don't remove the video
                if (el.tagName === 'VIDEO') return;
                console.log(`[Simli] Removing element: ${el.tagName} class="${el.className}"`);
                el.remove();
            });
            
            // Check shadow roots
            root.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                    removeElements(el.shadowRoot, depth + 1);
                }
            });
            
            // Check iframes
            root.querySelectorAll('iframe').forEach(iframe => {
                try {
                    if (iframe.contentDocument) {
                        removeElements(iframe.contentDocument.body, depth + 1);
                    }
                } catch (e) {
                    // Cross-origin, can't access
                }
            });
        };
        
        // Run immediately and on interval to catch dynamically added elements
        const runRemove = () => {
            if (!this.widget) return;
            removeElements(this.widget);
            if (this.widget.shadowRoot) {
                removeElements(this.widget.shadowRoot);
            }
        };
        
        // Run many times to catch elements as they load
        runRemove();
        setTimeout(runRemove, 100);
        setTimeout(runRemove, 300);
        setTimeout(runRemove, 500);
        setTimeout(runRemove, 1000);
        setTimeout(runRemove, 1500);
        setTimeout(runRemove, 2000);
        setTimeout(runRemove, 3000);
        
        console.log('[Simli] Removing loading UI elements');
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
                console.log('[Simli] 🎬 Video found, starting black removal');
                this.blackRemover.start(video);
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

