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

export class SimliIntegration {
    constructor(stateMachine, config) {
        this.stateMachine = stateMachine;
        this.config = config;
        this.widget = null;
        this.mountPoint = document.getElementById('simli-mount');
        
        // Bind handlers
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleTransitionEnd = this.handleTransitionEnd.bind(this);
        
        // Subscribe to state machine
        stateMachine.on('stateChange', this.handleStateChange);
        stateMachine.on('transitionEnd', this.handleTransitionEnd);
        
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
        if (type === 'in') {
            // Character has arrived, create widget
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
        if (this.widget) {
            console.warn('[Simli] Widget exists, destroying first');
            this.destroyWidget();
        }

        try {
            console.log(`[Simli] Creating widget for ${character.name}...`);
            
            // Show loading state
            document.body.classList.add('loading');
            
            // Fetch session token from backend
            const token = await this.fetchToken(character.agentId, character.faceId);
            
            // Create widget element
            this.widget = document.createElement('simli-widget');
            this.widget.setAttribute('agent-id', character.agentId);
            this.widget.setAttribute('face-id', character.faceId);
            this.widget.setAttribute('session-token', token);
            
            // Widget event listeners
            this.widget.addEventListener('simli-ready', () => {
                console.log(`[Simli] ${character.name} is ready to speak`);
                document.body.classList.remove('loading');
            });
            
            this.widget.addEventListener('simli-error', (e) => {
                console.error('[Simli] Widget error:', e.detail);
                document.body.classList.remove('loading');
                this.handleWidgetError(e.detail);
            });
            
            this.widget.addEventListener('simli-ended', () => {
                console.log('[Simli] Session ended by server');
                // Could auto-dismiss here if desired
            });
            
            // Mount widget
            this.mountPoint.appendChild(this.widget);
            console.log(`[Simli] ${character.name} mounted`);
            
        } catch (error) {
            console.error('[Simli] Widget creation failed:', error);
            document.body.classList.remove('loading');
            this.handleWidgetError(error);
        }
    }

    /**
     * Destroy and unmount widget
     */
    destroyWidget() {
        if (!this.widget) return;

        console.log('[Simli] Destroying widget...');
        
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

