/**
 * HEARSAY Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Experience: THE HOTEL
 * 
 * Characters appear at your door. You decide what to believe.
 * System prompts are configured in Simli agent dashboard, not here.
 */

export const config = {
    // Backend endpoint for Simli token generation (Railway will set this)
    tokenEndpoint: '/api/simli-token',
    
    // Experience metadata
    experience: {
        name: 'The Hotel',
        tagline: 'The owner died six months ago. People keep knocking.',
    },
    
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

/**
 * Character Definitions
 * ─────────────────────────────────────────────────────────────────────────────
 * 
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
    
    // Future characters for THE HOTEL:
    //
    // evelyn: {
    //     name: 'Evelyn',
    //     role: 'Long-term Guest, Evening Wear',
    //     agentId: 'xxx',
    //     faceId: 'xxx',
    //     idleToActive: ['assets/videos/idle_to_evelyn.mp4'],
    //     activeToIdle: ['assets/videos/evelyn_to_idle.mp4'],
    //     knockSound: 'assets/sounds/knock_timid.mp3'
    // },
    //
    // thursday: {
    //     name: 'The Thursday Guest',
    //     role: 'Weekly Visitor',
    //     agentId: 'xxx',
    //     faceId: 'xxx',
    //     // Multiple transition options for variety
    //     idleToActive: [
    //         'assets/videos/idle_to_thursday_1.mp4',
    //         'assets/videos/idle_to_thursday_2.mp4'
    //     ],
    //     activeToIdle: ['assets/videos/thursday_to_idle.mp4'],
    //     knockSound: null  // He doesn't knock
    // },
    //
    // assistant: {
    //     name: 'Ms. Park',
    //     role: "Owner's Former Assistant",
    //     agentId: 'xxx',
    //     faceId: 'xxx',
    //     idleToActive: ['assets/videos/idle_to_park.mp4'],
    //     activeToIdle: ['assets/videos/park_to_idle.mp4'],
    //     knockSound: 'assets/sounds/knock_businesslike.mp3'
    // }
};

/**
 * Helper: Get random item from array
 */
export function randomFrom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Helper: Get character by key
 */
export function getCharacter(key) {
    return characters[key] || null;
}

/**
 * Helper: Get all character keys
 */
export function getCharacterKeys() {
    return Object.keys(characters);
}

