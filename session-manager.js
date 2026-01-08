/**
 * HEARSAY Session Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages user sessions across multiple character conversations.
 * 
 * A "session" is one visit to the site (tab open → tab close or "End Session").
 * A "conversation" is one character interaction.
 * One session = many conversations = one chapter.
 */

export class SessionManager {
    constructor() {
        this.SESSION_KEY = 'hearsay_user_session';
        this.TRANSCRIPTS_KEY = 'hearsay_session_transcripts';
        
        // Initialize or restore session
        this.sessionId = this.getOrCreateSession();
        this.sessionStart = this.getSessionStart();
        
        console.log(`[Session] 📋 Session ID: ${this.sessionId}`);
        console.log(`[Session] Started: ${this.sessionStart}`);
    }
    
    /**
     * Get existing session or create new one
     * Uses sessionStorage so it persists across page refreshes but not tab closes
     */
    getOrCreateSession() {
        let session = sessionStorage.getItem(this.SESSION_KEY);
        
        if (!session) {
            session = crypto.randomUUID();
            sessionStorage.setItem(this.SESSION_KEY, session);
            sessionStorage.setItem(`${this.SESSION_KEY}_start`, new Date().toISOString());
            console.log('[Session] ✨ New session created');
        } else {
            console.log('[Session] 🔄 Existing session restored');
        }
        
        return session;
    }
    
    /**
     * Get session start time
     */
    getSessionStart() {
        return sessionStorage.getItem(`${this.SESSION_KEY}_start`) || new Date().toISOString();
    }
    
    /**
     * Get current session ID
     */
    getSessionId() {
        return this.sessionId;
    }
    
    /**
     * Store a conversation transcript for this session
     * @param {string} simliSessionId - Simli's session ID for this conversation
     * @param {Object} character - Character info
     * @param {Object} transcriptData - Raw transcript from Simli
     */
    storeConversation(simliSessionId, character, transcriptData) {
        try {
            // Get existing transcripts for this session
            const transcripts = this.getSessionTranscripts();
            
            // Add new conversation
            const conversation = {
                simliSessionId,
                character: character?.name || 'Unknown',
                characterId: character?.id || null,
                role: character?.role || null,
                timestamp: new Date().toISOString(),
                transcript: transcriptData.transcript || transcriptData
            };
            
            transcripts.push(conversation);
            
            // Store back to localStorage (persists beyond session for retrieval)
            const storageKey = `${this.TRANSCRIPTS_KEY}_${this.sessionId}`;
            localStorage.setItem(storageKey, JSON.stringify({
                userSessionId: this.sessionId,
                sessionStart: this.sessionStart,
                lastUpdated: new Date().toISOString(),
                conversations: transcripts
            }));
            
            // Update session index
            this.updateSessionIndex();
            
            console.log(`[Session] 💾 Conversation stored: ${character?.name} (${transcripts.length} total)`);
            
            // Dispatch event for UI updates
            window.dispatchEvent(new CustomEvent('hearsay-conversation-stored', {
                detail: {
                    sessionId: this.sessionId,
                    conversationCount: transcripts.length,
                    character: character?.name
                }
            }));
            
            return conversation;
            
        } catch (error) {
            console.error('[Session] Error storing conversation:', error);
            return null;
        }
    }
    
    /**
     * Get all transcripts for current session
     */
    getSessionTranscripts() {
        try {
            const storageKey = `${this.TRANSCRIPTS_KEY}_${this.sessionId}`;
            const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
            return data?.conversations || [];
        } catch (error) {
            console.error('[Session] Error getting transcripts:', error);
            return [];
        }
    }
    
    /**
     * Get full session data (for Writing Engine)
     */
    getSessionData() {
        try {
            const storageKey = `${this.TRANSCRIPTS_KEY}_${this.sessionId}`;
            const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
            
            if (!data) {
                return {
                    userSessionId: this.sessionId,
                    sessionStart: this.sessionStart,
                    conversations: []
                };
            }
            
            return data;
        } catch (error) {
            console.error('[Session] Error getting session data:', error);
            return null;
        }
    }
    
    /**
     * Update index of all sessions (for history/chapters page)
     */
    updateSessionIndex() {
        try {
            const indexKey = 'hearsay_sessions_index';
            const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
            
            // Check if this session is already indexed
            const existing = index.find(s => s.sessionId === this.sessionId);
            
            if (existing) {
                existing.lastUpdated = new Date().toISOString();
                existing.conversationCount = this.getSessionTranscripts().length;
            } else {
                index.push({
                    sessionId: this.sessionId,
                    sessionStart: this.sessionStart,
                    lastUpdated: new Date().toISOString(),
                    conversationCount: this.getSessionTranscripts().length,
                    chapterGenerated: false
                });
            }
            
            localStorage.setItem(indexKey, JSON.stringify(index));
            
        } catch (error) {
            console.error('[Session] Error updating index:', error);
        }
    }
    
    /**
     * Get all sessions (for history page)
     */
    static getAllSessions() {
        try {
            const indexKey = 'hearsay_sessions_index';
            return JSON.parse(localStorage.getItem(indexKey) || '[]');
        } catch (error) {
            console.error('[Session] Error getting all sessions:', error);
            return [];
        }
    }
    
    /**
     * Get session data by ID (for Writing Engine)
     * @param {string} sessionId - User session ID
     */
    static getSessionById(sessionId) {
        try {
            const storageKey = `hearsay_session_transcripts_${sessionId}`;
            return JSON.parse(localStorage.getItem(storageKey) || 'null');
        } catch (error) {
            console.error('[Session] Error getting session by ID:', error);
            return null;
        }
    }
    
    /**
     * Mark session as having generated a chapter
     * @param {string} sessionId - User session ID
     * @param {string} chapterId - Generated chapter ID
     */
    static markChapterGenerated(sessionId, chapterId) {
        try {
            const indexKey = 'hearsay_sessions_index';
            const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
            
            const session = index.find(s => s.sessionId === sessionId);
            if (session) {
                session.chapterGenerated = true;
                session.chapterId = chapterId;
                session.chapterGeneratedAt = new Date().toISOString();
                localStorage.setItem(indexKey, JSON.stringify(index));
            }
            
        } catch (error) {
            console.error('[Session] Error marking chapter generated:', error);
        }
    }
    
    /**
     * Check if current session has conversations
     */
    hasConversations() {
        return this.getSessionTranscripts().length > 0;
    }
    
    /**
     * Get conversation count for current session
     */
    getConversationCount() {
        return this.getSessionTranscripts().length;
    }
    
    /**
     * End current session (for "End Session" button)
     * Returns session data for chapter generation
     */
    endSession() {
        const sessionData = this.getSessionData();
        
        // Clear session from sessionStorage (new session on next visit)
        sessionStorage.removeItem(this.SESSION_KEY);
        sessionStorage.removeItem(`${this.SESSION_KEY}_start`);
        
        console.log(`[Session] 🔚 Session ended: ${this.sessionId}`);
        console.log(`[Session] Conversations: ${sessionData?.conversations?.length || 0}`);
        
        return sessionData;
    }
    
    /**
     * Export session data for chapter generation API
     */
    exportForWritingEngine() {
        const data = this.getSessionData();
        
        if (!data || !data.conversations || data.conversations.length === 0) {
            console.warn('[Session] No conversations to export');
            return null;
        }
        
        return {
            sessionId: this.sessionId,
            sessionStart: this.sessionStart,
            transcripts: data.conversations.map(conv => ({
                character: conv.character,
                role: conv.role,
                timestamp: conv.timestamp,
                transcript: conv.transcript
            }))
        };
    }
}

// Singleton instance
let sessionManagerInstance = null;

export function getSessionManager() {
    if (!sessionManagerInstance) {
        sessionManagerInstance = new SessionManager();
    }
    return sessionManagerInstance;
}

