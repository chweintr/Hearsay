/**
 * HEARSAY Black Background Remover
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses canvas to replace pure black pixels with transparency.
 * Only affects pixels where R, G, B are all below the threshold.
 * Face shadows are preserved because they're not pure black.
 */

export class BlackRemover {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.video = null;
        this.isRunning = false;
        this.threshold = 8; // LOWERED: Only pure black (pupils, hair are darker but not THIS dark)
        this.edgeFadeStart = 0.35; // Start fading at 35% from center
        this.useEdgeFade = true; // Apply circular gradient to fade edges
        
        console.log('[BlackRemover] Initialized');
    }
    
    /**
     * Start processing a video element
     */
    start(videoElement) {
        if (!videoElement) {
            console.error('[BlackRemover] No video element provided');
            return;
        }
        
        this.video = videoElement;
        
        // Create canvas overlay - LARGER than peephole to hide square edges
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'simli-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 48%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 110vmin;
            height: 110vmin;
            pointer-events: none;
            z-index: 100;
        `;
        
        // Track when we've rendered enough frames
        this.framesRendered = 0;
        
        // Insert canvas in the simli-mount, not next to video
        const simliMount = document.getElementById('simli-mount');
        if (simliMount) {
            simliMount.appendChild(this.canvas);
        } else {
            this.video.parentElement.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        // Hide the original video completely
        this.video.style.opacity = '0';
        this.video.style.visibility = 'hidden';
        
        this.isRunning = true;
        this.processFrame();
        
        console.log('[BlackRemover] Started processing');
    }
    
    /**
     * Process each frame
     */
    processFrame() {
        if (!this.isRunning || !this.video) return;
        
        // Match canvas size to video
        if (this.video.videoWidth && this.video.videoHeight) {
            if (this.canvas.width !== this.video.videoWidth) {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
            }
            
            // Draw video frame to canvas
            this.ctx.drawImage(this.video, 0, 0);
            
            // Get pixel data
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;
            
            // Calculate center for edge fade
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const maxRadius = Math.min(centerX, centerY);
            
            // Replace black pixels with transparent, with edge protection
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Calculate pixel position
                const pixelIndex = i / 4;
                const x = pixelIndex % this.canvas.width;
                const y = Math.floor(pixelIndex / this.canvas.width);
                
                // Distance from center (0 = center, 1 = edge)
                const dx = (x - centerX) / maxRadius;
                const dy = (y - centerY) / maxRadius;
                const distFromCenter = Math.sqrt(dx * dx + dy * dy);
                
                // In the center area, use VERY strict threshold to protect features
                // At edges, use normal threshold to remove background
                let effectiveThreshold = this.threshold;
                if (distFromCenter < this.edgeFadeStart) {
                    // Center zone: only remove PURE black (threshold 3)
                    effectiveThreshold = 3;
                } else if (distFromCenter < 0.7) {
                    // Transition zone: gradually increase threshold
                    const t = (distFromCenter - this.edgeFadeStart) / (0.7 - this.edgeFadeStart);
                    effectiveThreshold = 3 + t * (this.threshold - 3);
                }
                // Beyond 0.7: use full threshold
                
                // If all RGB values are below effective threshold, make transparent
                if (r < effectiveThreshold && g < effectiveThreshold && b < effectiveThreshold) {
                    data[i + 3] = 0; // Set alpha to 0
                }
            }
            
            // Put modified data back
            this.ctx.putImageData(imageData, 0, 0);
            
            // Track frames rendered
            this.framesRendered++;
            
            // Fire callback after 10 frames (about 0.3s at 30fps)
            if (this.framesRendered === 10 && this.onReady) {
                console.log('[BlackRemover] Canvas ready - 10 frames rendered');
                this.onReady();
            }
        }
        
        // Continue processing
        requestAnimationFrame(() => this.processFrame());
    }
    
    /**
     * Set callback for when canvas is ready to show
     */
    setOnReady(callback) {
        this.onReady = callback;
    }
    
    /**
     * Stop processing and cleanup
     */
    stop() {
        this.isRunning = false;
        
        if (this.video) {
            this.video.style.opacity = '1';
        }
        
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
        
        this.canvas = null;
        this.ctx = null;
        this.video = null;
        
        console.log('[BlackRemover] Stopped');
    }
    
    /**
     * Set the black threshold (0-255)
     * Lower = only pure black, Higher = more dark colors removed
     */
    setThreshold(value) {
        this.threshold = Math.max(0, Math.min(255, value));
        console.log(`[BlackRemover] Threshold set to ${this.threshold}`);
    }
}

