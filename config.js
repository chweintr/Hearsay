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
        name: 'Wire (Wiremu)',
        role: 'Long-Time Resident',
        agentId: '2439209e-abb8-4ccc-ab18-2bbbfc78d4f6',
        faceId: 'bc603b3f-d355-424d-b613-d7db4588cb8a',
        idleToActive: ['assets/videos/Wire_Walkup_2.mp4'],
        activeToIdle: ['assets/videos/Wire_Walkup_2.mp4'],  // TODO: need departure video
        knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
        previewVideo: 'assets/videos/Wire_Walkup_2.mp4'
    },
    
    marisol: {
        name: 'Marisol',
        role: "Owner's Daughter",
        agentId: 'xxx',  // TODO: Simli agent ID
        faceId: 'xxx',   // TODO: Simli face ID
        idleToActive: ['assets/videos/Marisol_Walkup.mp4'],
        activeToIdle: ['assets/videos/Marisol_Walkup.mp4'],  // TODO: need departure video
        knockSound: 'assets/sounds/door_knocks/knock_office.wav',
        previewVideo: 'assets/videos/Marisol_Walkup.mp4'
    },
    
    // THE KNOCK - Full Character Roster (8 total):
    // 1. Wire (Wiremu) - Long Time Resident ✓ COMPLETE
    // 2. Marisol - Owner's Daughter ✓ COMPLETE
    // 3. Eddie - The Chef (PROMPT COMPLETE, needs Simli)
    // 4. Dotty/Bette - The Old Woman (British, bawdy, tipsy) - PROMPT NEEDED
    // 5. Tane/Rawiri - Wire's Brother (younger, arrogant) - PROMPT NEEDED
    // 6. Constance/Vivian - Red-Headed Woman (aloof, cultured) - PROMPT NEEDED
    // 7. Lenny/Sal - The Comedian (random availability!) - PROMPT NEEDED
    // 8. Caleb - The Author (meta character) - PROMPT NEEDED
    //
    // Future characters:
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
