/**
 * HEARSAY Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Platform: HEARSAY - "Unreliable narrators, reliable conversations"
 * Experience: ROOM 412 - "Stories through the door"
 * 
 * Characters appear at your door. You decide what to believe.
 * System prompts are configured in Simli agent dashboard, not here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const platform = {
    name: 'HEARSAY',
    tagline: 'Unreliable narrators, reliable conversations',
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIENCE CONFIG (Room 412)
// ─────────────────────────────────────────────────────────────────────────────

export const experience = {
    id: 'room-412',
    name: 'Room 412',
    tagline: 'Stories through the door',
    landingImage: 'assets/images/Room_412.png',
    visualConceit: 'peephole',  // peephole | portrait | window | mirror | etc.
};

// ─────────────────────────────────────────────────────────────────────────────
// APP CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
    // Backend endpoint for Simli token generation
    tokenEndpoint: '/api/simli-token',
    
    // Audio settings
    audio: {
        knockDelay: 300,      // ms before knock sound plays after summon
        knockVolume: 0.7,
        ambientVolume: 0.2,
    },
    
    // Transition timing (should match video durations)
    transitions: {
        inDuration: 2500,     // ms for approach/appear transition
        outDuration: 2000,    // ms for departure transition  
        fadeOverlap: 150      // ms overlap for smooth layer fades
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHARACTER DEFINITIONS (Room 412)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Each character:
 *   - name: Display name
 *   - role: Their position at the hotel
 *   - agentId: Simli agent ID (from dashboard)
 *   - faceId: Simli face ID (from dashboard)  
 *   - idleToActive: Transition video(s) - array for random selection
 *   - activeToIdle: Departure video(s)
 *   - knockSound: Optional custom knock (some characters don't knock)
 */

export const characters = {
    wire: {
        name: 'Wire',
        role: 'Night Porter',
        agentId: 'xxx',  // TODO: Simli agent ID
        faceId: 'xxx',   // TODO: Simli face ID
        idleToActive: ['assets/videos/idle_to_wire.mp4'],
        activeToIdle: ['assets/videos/wire_to_idle.mp4'],
        knockSound: 'assets/sounds/knock_soft.mp3'
    },
    
    marisol: {
        name: 'Marisol',
        role: 'House Detective',
        agentId: 'xxx',  // TODO: Simli agent ID
        faceId: 'xxx',   // TODO: Simli face ID
        idleToActive: ['assets/videos/idle_to_marisol.mp4'],
        activeToIdle: ['assets/videos/marisol_to_idle.mp4'],
        knockSound: 'assets/sounds/knock_firm.mp3'
    },
    
    // Future characters for ROOM 412:
    //
    // evelyn: {
    //     name: 'Evelyn',
    //     role: 'Long-term Guest',
    //     ...
    // },
    //
    // thursday: {
    //     name: 'The Thursday Guest',
    //     role: 'Weekly Visitor',
    //     knockSound: null  // He doesn't knock
    // },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function randomFrom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

export function getCharacter(key) {
    return characters[key] || null;
}

export function getCharacterKeys() {
    return Object.keys(characters);
}
