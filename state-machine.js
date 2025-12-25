/**
 * HEARSAY State Machine
 * ─────────────────────────────────────────────────────────────────────────────
 * Central controller for the experience flow.
 * 
 * States:
 *   idle → transitioning-in → active → transitioning-out → idle
 * 
 * The user is inside, in darkness. Someone is at the door.
 * They decide when to send the visitor away.
 * 
 * Events emitted:
 *   - stateChange: { from, to, character }
 *   - characterSummoned: { character }
 *   - characterDismissed: { character }
 *   - transitionStart: { type: 'in' | 'out', character }
 *   - transitionEnd: { type: 'in' | 'out', character }
 */

export class StateMachine {
    constructor() {
        this.currentState = 'idle';
        this.currentCharacter = null;
        this.listeners = new Map();
        this.conversationCount = 0;  // For hint system triggers
        
        // Valid state transitions (one-way flow)
        this.transitions = {
            'idle': ['transitioning-in'],
            'transitioning-in': ['active'],
            'active': ['transitioning-out'],
            'transitioning-out': ['idle']
        };
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        return () => this.listeners.get(event).delete(callback);
    }

    /**
     * Emit an event to all listeners
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data = {}) {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (e) {
                    console.error(`[StateMachine] Error in ${event} handler:`, e);
                }
            });
        }
    }

    /**
     * Check if a transition is valid
     * @param {string} to - Target state
     * @returns {boolean}
     */
    canTransitionTo(to) {
        const allowed = this.transitions[this.currentState];
        return allowed && allowed.includes(to);
    }

    /**
     * Transition to a new state
     * @param {string} to - Target state
     * @returns {boolean} Success
     */
    transitionTo(to) {
        if (!this.canTransitionTo(to)) {
            console.warn(`[StateMachine] Invalid transition: ${this.currentState} → ${to}`);
            return false;
        }

        const from = this.currentState;
        this.currentState = to;
        
        const charName = this.currentCharacter?.name || 'no one';
        console.log(`[StateMachine] ${from} → ${to} (${charName})`);
        
        this.emit('stateChange', {
            from,
            to,
            character: this.currentCharacter
        });

        return true;
    }

    /**
     * Summon a character to the door
     * @param {string} characterKey - Key from characters config
     */
    summonCharacter(characterKey) {
        if (this.currentState !== 'idle') {
            console.warn('[StateMachine] Cannot summon: someone is already at the door');
            return false;
        }

        // Dynamic import to get character data
        import('./config.js').then(({ getCharacter }) => {
            const character = getCharacter(characterKey);
            if (!character) {
                console.error(`[StateMachine] Character not found: ${characterKey}`);
                return;
            }

            this.currentCharacter = { key: characterKey, ...character };
            
            console.log(`[StateMachine] ${character.name} approaches the door...`);
            
            this.emit('characterSummoned', { character: this.currentCharacter });
            this.emit('transitionStart', { type: 'in', character: this.currentCharacter });
            
            this.transitionTo('transitioning-in');
        });

        return true;
    }

    /**
     * Send away the current visitor
     */
    dismissCharacter() {
        if (this.currentState !== 'active') {
            console.warn('[StateMachine] Cannot dismiss: no one at the door');
            return false;
        }

        console.log(`[StateMachine] Sending ${this.currentCharacter.name} away...`);
        
        this.emit('transitionStart', { type: 'out', character: this.currentCharacter });
        this.transitionTo('transitioning-out');

        return true;
    }

    /**
     * Called when transition-in video completes (character has arrived)
     */
    onTransitionInComplete() {
        if (this.currentState !== 'transitioning-in') return;
        
        console.log(`[StateMachine] ${this.currentCharacter.name} is at your door`);
        
        this.emit('transitionEnd', { type: 'in', character: this.currentCharacter });
        this.transitionTo('active');
    }

    /**
     * Called when transition-out video completes (character has left)
     */
    onTransitionOutComplete() {
        if (this.currentState !== 'transitioning-out') return;
        
        const character = this.currentCharacter;
        this.currentCharacter = null;
        this.conversationCount++;
        
        console.log(`[StateMachine] ${character.name} walks away. Conversations: ${this.conversationCount}`);
        
        this.emit('transitionEnd', { type: 'out', character });
        this.emit('characterDismissed', { character });
        this.transitionTo('idle');
        
        // Hint system trigger (future: check if hint should surface)
        this.checkHintTriggers();
    }

    /**
     * Check if any hints should be surfaced
     * (Placeholder for future hint system)
     */
    checkHintTriggers() {
        // After N conversations, surface a hint
        // For now, just log
        if (this.conversationCount > 0 && this.conversationCount % 3 === 0) {
            console.log('[StateMachine] Hint trigger point reached');
            // Future: emit('hintAvailable', { hint })
        }
    }

    /**
     * Force reset to idle (for error recovery)
     */
    reset() {
        const from = this.currentState;
        this.currentState = 'idle';
        this.currentCharacter = null;
        
        console.log('[StateMachine] Reset to idle');
        this.emit('stateChange', { from, to: 'idle', character: null });
    }

    /**
     * Get current state info
     */
    getState() {
        return {
            state: this.currentState,
            character: this.currentCharacter,
            conversationCount: this.conversationCount
        };
    }
}

