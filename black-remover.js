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
        
        // Chroma key mode: 'black' (default) or 'green'
        this.chromaKey = 'black';
        this.chromaThreshold = 100; // For green screen: max color distance
        
        // Thresholds for black removal
        this.threshold = 4; // Edge threshold (background)
        this.centerThreshold = 0; // Center: NEVER remove anything (hair protection)
        
        // Head protection zone - NO black removal here at all
        // Head is typically upper-center of frame
        this.headZone = {
            centerX: 0.5,   // Horizontal center (0-1)
            centerY: 0.35,  // Slightly above vertical center (heads are upper)
            radiusX: 0.35,  // Wide enough for hair
            radiusY: 0.4    // Tall enough for hair + face
        };
        
        console.log('[BlackRemover] Initialized with HEAD PROTECTION ZONE');
    }
    
    /**
     * Set chroma key mode
     * @param {string} key - 'black' (default), '#00ff00' (green), or hex color
     */
    setChromaKey(key) {
        if (!key || key === 'black') {
            this.chromaKey = 'black';
            console.log('[BlackRemover] Using BLACK key');
        } else if (key.startsWith('#')) {
            // Parse hex color
            this.chromaKey = 'custom';
            this.keyColor = this.hexToRgb(key);
            console.log(`[BlackRemover] Using CUSTOM key: ${key} → RGB(${this.keyColor.r}, ${this.keyColor.g}, ${this.keyColor.b})`);
        } else {
            this.chromaKey = key;
            console.log(`[BlackRemover] Using ${key.toUpperCase()} key`);
        }
    }
    
    /**
     * Convert hex color to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 255, b: 0 }; // Default to green
    }
    
    /**
     * Check if a pixel matches the chroma key color
     */
    isChromaKeyMatch(r, g, b) {
        if (this.chromaKey === 'black') {
            // Black key logic (existing behavior)
            return false; // Handled separately in processFrame
        }
        
        // For green screen or custom color
        const keyColor = this.keyColor || { r: 0, g: 255, b: 0 }; // Default green
        
        // Color distance in RGB space
        const distance = Math.sqrt(
            Math.pow(r - keyColor.r, 2) +
            Math.pow(g - keyColor.g, 2) +
            Math.pow(b - keyColor.b, 2)
        );
        
        return distance < this.chromaThreshold;
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
            
            // Calculate head protection zone in pixels
            const headCenterX = this.canvas.width * this.headZone.centerX;
            const headCenterY = this.canvas.height * this.headZone.centerY;
            const headRadiusX = this.canvas.width * this.headZone.radiusX;
            const headRadiusY = this.canvas.height * this.headZone.radiusY;
            
            // Replace keyed pixels with transparent
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // GREEN SCREEN or CUSTOM KEY: Simple color distance matching
                if (this.chromaKey !== 'black') {
                    if (this.isChromaKeyMatch(r, g, b)) {
                        data[i + 3] = 0; // Set alpha to 0
                    }
                    continue;
                }
                
                // BLACK KEY: Use head protection zone logic
                
                // Calculate pixel position
                const pixelIndex = i / 4;
                const x = pixelIndex % this.canvas.width;
                const y = Math.floor(pixelIndex / this.canvas.width);
                
                // Check if pixel is inside head protection ellipse
                const dx = (x - headCenterX) / headRadiusX;
                const dy = (y - headCenterY) / headRadiusY;
                const distFromHeadCenter = Math.sqrt(dx * dx + dy * dy);
                
                // HEAD PROTECTION: Inside head zone, only remove PURE black (0,0,0)
                // This removes background while preserving dark hair (which is never pure 0,0,0)
                if (distFromHeadCenter < 1.0) {
                    // Inside head ellipse: ultra-strict - only RGB(0,0,0) exactly
                    if (r === 0 && g === 0 && b === 0) {
                        data[i + 3] = 0; // Remove pure black background
                    }
                    continue; // Skip further processing for head zone
                }
                
                // Outside head zone: remove pure black background
                // Use stricter threshold near head, more lenient at edges
                let effectiveThreshold = this.threshold;
                if (distFromHeadCenter < 1.3) {
                    // Transition zone just outside head: very strict
                    effectiveThreshold = 1;
                } else if (distFromHeadCenter < 1.6) {
                    // Further out: gradually increase
                    const t = (distFromHeadCenter - 1.3) / 0.3;
                    effectiveThreshold = 1 + t * (this.threshold - 1);
                }
                
                // Remove if pure black (or very near black at edges)
                if (r <= effectiveThreshold && g <= effectiveThreshold && b <= effectiveThreshold) {
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

