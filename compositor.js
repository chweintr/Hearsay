/**
 * HEARSAY Compositor
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates video playback and layer visibility.
 * Listens to the state machine and controls what you see through the peephole.
 * 
 * Layer stack (bottom to top):
 *   0. Background - Empty hallway, idle loop
 *   1. Transition - Character approaching/leaving
 *   2. Simli - Live AI talking head
 *   3. Peephole mask - Brass ring, glass distortion
 *   4. Door overlay - Additional hardware PNG
 *   5. Vignette - The darkness of your room
 */

import { config, randomFrom } from './config.js';

export class Compositor {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        
        // Cache DOM elements
        this.layers = {
            background: document.getElementById('layer-background'),
            transition: document.getElementById('layer-transition'),
            simli: document.getElementById('layer-simli')
        };
        
        this.videos = {
            idle: document.getElementById('video-hallway'),
            transition: document.getElementById('video-transition')
        };
        
        this.audio = {
            knock: document.getElementById('audio-knock'),
            ambient: document.getElementById('audio-ambient')
        };

        // Bind handlers
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleTransitionStart = this.handleTransitionStart.bind(this);
        this.handleTransitionVideoEnd = this.handleTransitionVideoEnd.bind(this);

        // Subscribe to state machine
        stateMachine.on('stateChange', this.handleStateChange);
        stateMachine.on('transitionStart', this.handleTransitionStart);
        
        // Video end triggers state progression
        this.videos.transition.addEventListener('ended', this.handleTransitionVideoEnd);
        
        // Handle door ring image loading
        const doorRing = document.getElementById('door-ring');
        if (doorRing) {
            doorRing.onload = () => doorRing.classList.add('loaded');
            doorRing.onerror = () => console.log('[Compositor] No door ring overlay loaded');
        }
        
        console.log('[Compositor] Initialized');
    }

    /**
     * React to state changes
     */
    handleStateChange({ from, to, character }) {
        switch (to) {
            case 'idle':
                this.showIdleState();
                break;
            case 'active':
                this.showActiveState();
                break;
        }
    }

    /**
     * Handle transition start - play the appropriate video
     */
    handleTransitionStart({ type, character }) {
        if (type === 'in') {
            // Someone approaching
            this.playKnock(character);
            this.playTransitionVideo(character.idleToActive, 'in');
        } else if (type === 'out') {
            // Someone leaving
            this.playTransitionVideo(character.activeToIdle, 'out');
        }
    }

    /**
     * Play knock sound (some characters don't knock)
     */
    playKnock(character) {
        if (!character.knockSound) {
            console.log(`[Compositor] ${character.name} doesn't knock`);
            return;
        }
        
        const knockSrc = character.knockSound;
        
        // Update source if different
        if (this.audio.knock.src !== knockSrc) {
            this.audio.knock.src = knockSrc;
        }
        
        this.audio.knock.volume = config.audio.knockVolume;
        this.audio.knock.currentTime = 0;
        
        // Delay knock slightly for realism
        setTimeout(() => {
            this.audio.knock.play()
                .then(() => console.log(`[Compositor] Knock: ${character.name}`))
                .catch(e => console.warn('[Compositor] Knock blocked:', e.message));
        }, config.audio.knockDelay);
    }

    /**
     * Play a transition video
     * @param {string[]} videoArray - Array of possible video paths
     * @param {string} type - 'in' or 'out'
     */
    playTransitionVideo(videoArray, type) {
        console.log(`[Compositor] playTransitionVideo called, type: ${type}, videos:`, videoArray);
        const videoPath = randomFrom(videoArray);
        
        if (!videoPath) {
            console.warn(`[Compositor] No transition video for ${type}, skipping`);
            this.handleTransitionVideoEnd();
            return;
        }
        
        console.log(`[Compositor] Playing ${type} transition:`, videoPath);
        
        // Set and load video
        this.videos.transition.src = videoPath;
        this.videos.transition.load();
        
        // For 'in' transitions: LOOP the walkup video until Simli is ready
        // This prevents the awkward gap between walkup ending and Simli appearing
        if (type === 'in') {
            this.videos.transition.loop = true;
            console.log('[Compositor] Walkup video set to LOOP until Simli is ready');
        } else {
            this.videos.transition.loop = false;
        }
        
        // Show transition layer
        this.showLayer('transition');
        
        // Remember transition type for when video ends
        this.videos.transition.dataset.transitionType = type;
        
        // Play
        this.videos.transition.play().catch(e => {
            console.error('[Compositor] Transition video failed:', e.message);
            // Skip to next state on error
            this.handleTransitionVideoEnd();
        });
        
        // For 'in' transitions, trigger state machine after first play-through
        // but KEEP the video playing (looping) until Simli hides it
        if (type === 'in') {
            this.videos.transition.addEventListener('ended', () => {
                // This won't fire because video loops, so use timeupdate instead
            }, { once: true });
            
            // Use a flag to only trigger once
            let hasTriggeredTransition = false;
            const checkProgress = () => {
                if (!hasTriggeredTransition && this.videos.transition.currentTime > 0.5) {
                    // After 0.5 seconds, trigger state machine to load Simli
                    // Video keeps playing/looping
                    hasTriggeredTransition = true;
                    console.log('[Compositor] Triggering Simli load while walkup loops...');
                    this.stateMachine.onTransitionInComplete();
                }
            };
            this.videos.transition.addEventListener('timeupdate', checkProgress);
        }
    }

    /**
     * Handle transition video ended
     */
    handleTransitionVideoEnd() {
        const type = this.videos.transition.dataset.transitionType;
        console.log(`[Compositor] Transition video ended, type: ${type}`);
        
        // For 'out' transitions, hide layer and notify
        // For 'in' transitions, the video loops - Simli integration handles hiding
        if (type === 'out') {
            this.hideLayer('transition');
            console.log('[Compositor] Calling onTransitionOutComplete...');
            this.stateMachine.onTransitionOutComplete();
        }
        // Note: 'in' transitions are handled via timeupdate in playTransitionVideo
    }

    /**
     * Show idle state - empty hallway, no one at the door
     */
    showIdleState() {
        this.hideLayer('simli');
        this.hideLayer('transition');
        
        // Ensure idle loop is playing
        if (this.videos.idle.paused) {
            this.videos.idle.play()
                .catch(e => console.warn('[Compositor] Idle video blocked:', e.message));
        }
        
        // Remove active indicator
        document.body.classList.remove('simli-active');
    }

    /**
     * Show active state - someone at the door, Simli visible
     * Background STAYS visible - Simli composites on top with blend mode
     */
    showActiveState() {
        this.showLayer('simli');
        // DON'T hide transition here! Let simli-integration.js hide it
        // when the canvas is actually ready to show (after 10 frames)
        // this.hideLayer('transition');  // REMOVED - was causing flash
        
        // Note: background layer stays visible - mix-blend-mode: screen
        // makes Simli's black background transparent
        
        // Add active indicator for CSS effects
        document.body.classList.add('simli-active');
    }

    /**
     * Show a layer
     */
    showLayer(name) {
        const layer = this.layers[name];
        if (layer) {
            layer.classList.remove('hidden');
        }
    }

    /**
     * Hide a layer
     */
    hideLayer(name) {
        const layer = this.layers[name];
        if (layer) {
            layer.classList.add('hidden');
        }
    }

    /**
     * Start ambient audio (hallway sounds, distant elevator)
     */
    startAmbient() {
        this.audio.ambient.volume = config.audio.ambientVolume;
        this.audio.ambient.play()
            .then(() => console.log('[Compositor] Ambient audio started'))
            .catch(e => console.warn('[Compositor] Ambient audio blocked:', e.message));
    }

    /**
     * Stop ambient audio
     */
    stopAmbient() {
        this.audio.ambient.pause();
        this.audio.ambient.currentTime = 0;
    }

    /**
     * Preload videos for a character (call ahead of time)
     */
    preloadCharacterAssets(character) {
        const videos = [...(character.idleToActive || []), ...(character.activeToIdle || [])];
        
        videos.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'video';
            link.href = src;
            document.head.appendChild(link);
        });
        
        // Preload knock sound
        if (character.knockSound) {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = character.knockSound;
        }
    }
}

