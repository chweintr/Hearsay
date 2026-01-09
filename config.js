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
        activeToIdle: ['assets/videos/Wire_Walkup_2.mp4'],
        knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
        previewVideo: 'assets/videos/Wire_Walkup_2.mp4',
        status: 'ready'
    },
    
    marisol: {
        name: 'Marisol',
        role: "Owner's Daughter",
        agentId: '24105503-dbf2-48ec-9d14-b800f8ebedde',
        faceId: '28851337-4976-4692-b5c5-3c2825c8d522',
        // Incognito mode: random toggle between appearances
        // When incognito faceId is ready, add here and set randomizeFace: true
        faceVariants: [
            { id: '28851337-4976-4692-b5c5-3c2825c8d522', label: 'default' }
            // { id: 'xxx', label: 'incognito' }  // TODO: Add incognito faceId
        ],
        randomizeFace: false,  // Set true when incognito variant ready
        idleToActive: ['assets/videos/Marisol_Walkup.mp4'],
        activeToIdle: ['assets/videos/Marisol_Walkup.mp4'],
        knockSound: 'assets/sounds/door_knocks/knock_office.wav',
        previewVideo: 'assets/videos/Marisol_Walkup.mp4',
        status: 'ready'
    },
    
    eddie: {
        name: 'Eddie',
        role: 'Night Chef',
        agentId: '48daac40-f2ff-4174-af70-5ce922ce8efe',
        faceId: '9402a60c-ae80-4cb9-8bed-55ccb60e586f',
        idleToActive: ['assets/videos/Eddie_walkup.mp4'],
        activeToIdle: ['assets/videos/Eddie_walkup.mp4'],
        knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
        previewVideo: 'assets/videos/Eddie_walkup.mp4',
        status: 'ready'
    },
    
    dotty: {
        name: 'Dotty',
        role: 'Room 308',
        agentId: 'xxx',  // TODO: Add when Simli agent created
        faceId: 'xxx',   // TODO: Add when Simli face created
        idleToActive: ['assets/videos/Dotty_Walkup.mp4'],
        activeToIdle: ['assets/videos/Dotty_Walkup.mp4'],
        knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
        previewVideo: 'assets/videos/Dotty_Walkup.mp4',
        status: 'coming_soon'  // Change to 'ready' when agent ID added
    },
    
    tane: {
        name: 'Tane',
        role: "Wire's Brother",
        agentId: 'ca858324-9e89-42ae-9139-50e84a1ff4b1',
        faceId: '7e095ab0-626e-41e6-876b-e79403658524',
        idleToActive: ['assets/videos/Tane_Walkup.mp4'],
        activeToIdle: ['assets/videos/Tane_Walkup.mp4'],
        knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
        previewVideo: 'assets/videos/Tane_Walkup.mp4',
        status: 'ready'
    },
    
    constance: {
        name: 'Constance',
        role: 'Fourth Floor',
        agentId: 'xxx',
        faceId: 'xxx',
        idleToActive: [],
        activeToIdle: [],
        knockSound: null,
        previewVideo: null,
        status: 'coming_soon'
    },
    
    priya: {
        name: 'Priya',
        role: 'Bartender',
        agentId: 'a0819479-98ea-4c0b-990e-b44e14ce1378',
        faceId: '28503d8d-f54b-4e1f-b5fd-b3e2c9dc3f7e',
        idleToActive: ['assets/videos/Priya_Walkuup.mp4'],
        activeToIdle: ['assets/videos/Priya_Walkuup.mp4'],
        knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
        previewVideo: 'assets/videos/Priya_Walkuup.mp4',
        status: 'ready'
    },
    
    milton: {
        name: 'Milton',
        role: 'The Comedian',
        agentId: 'c25a4b14-34ea-4ab7-b438-c46d45091d7e',
        faceId: '4a0Khp1o5b79lIkuf4ia',
        idleToActive: ['assets/videos/Milton_Walkup.mp4'],
        activeToIdle: ['assets/videos/Milton_Walkup.mp4'],
        knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
        previewVideo: 'assets/videos/Milton_Walkup.mp4',
        status: 'ready',
        availability: 0.3,  // 30% chance he's "in town"
        unavailableMessages: [
            "Milton's on tour. Try again later.",
            "Not in tonight. Check back tomorrow.",
            "Performing in Wellington this week."
        ]
    },
    
    caleb: {
        name: 'Caleb',
        role: 'The Author',
        agentId: 'xxx',  // TODO: Add when Simli agent created
        faceId: 'xxx',   // TODO: Add when Simli face created
        idleToActive: ['assets/videos/Caleb_Walkup.mp4'],
        activeToIdle: ['assets/videos/Caleb_Walkup.mp4'],
        knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
        previewVideo: 'assets/videos/Caleb_Walkup.mp4',
        status: 'coming_soon'  // Change to 'ready' when agent ID added
    },
    rufus: {
        name: 'Rufus',
        role: 'The Clown',
        agentId: '97eca1b0-5bcf-4f4b-99f6-48840ab6817e',
        faceId: '297c78be-6d0c-404c-8468-928c87b248c4',
        idleToActive: ['assets/videos/Rufus_Walkup.mp4'],
        activeToIdle: ['assets/videos/Rufus_Walkup.mp4'],
        knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
        previewVideo: 'assets/videos/Rufus_Walkup.mp4',
        status: 'ready'
    },
    solomon: {
        name: 'Solomon',
        role: 'The Concierge',
        agentId: 'xxx',  // TODO: Add when Simli agent created
        faceId: 'xxx',   // TODO: Add when Simli face created
        idleToActive: ['assets/videos/Solomon_Walkup.mp4'],
        activeToIdle: ['assets/videos/Solomon_Walkup.mp4'],
        knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
        previewVideo: 'assets/videos/Solomon_Walkup.mp4',
        status: 'coming_soon'  // Change to 'ready' when agent ID added
    }
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
