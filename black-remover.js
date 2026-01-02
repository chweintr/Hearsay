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
        this.threshold = 15; // Pixels with R,G,B all below this become transparent
        
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
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100vmin;
            height: 100vmin;
            pointer-events: none;
            z-index: 100;
        `;
        
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
            
            // Replace black pixels with transparent
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // If all RGB values are below threshold, make transparent
                if (r < this.threshold && g < this.threshold && b < this.threshold) {
                    data[i + 3] = 0; // Set alpha to 0
                }
            }
            
            // Put modified data back
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        // Continue processing
        requestAnimationFrame(() => this.processFrame());
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

