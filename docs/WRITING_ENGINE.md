# Writing Engine — Design Document

> Transform conversations into literature.

---

## Overview

The Writing Engine takes raw Simli conversation transcripts and transforms them into narrativized prose chapters using Claude Opus 4.5. Users talk to characters; the engine turns those conversations into a personalized novel.

**Key principle:** The user's actual dialogue is preserved and woven into literary prose, but the engine embellishes — adding setting details, character thoughts, scenes the user didn't directly witness.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER SESSION                             │
│                                                                 │
│   User opens site → SESSION_ID generated (sessionStorage)       │
│                                                                 │
│   Talk to Wire    → transcript tagged with SESSION_ID           │
│   Talk to Eddie   → transcript tagged with SESSION_ID           │
│   Talk to Priya   → transcript tagged with SESSION_ID           │
│                                                                 │
│   User clicks "End Session" or closes tab                       │
│                          ↓                                      │
│   All transcripts from SESSION_ID bundled together              │
│                          ↓                                      │
│   POST /api/writing-engine/generate                             │
│                          ↓                                      │
│   Claude Opus 4.5 weaves into ONE chapter                       │
│                          ↓                                      │
│   Chapter stored → Available in /chapters tab                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Session vs. Conversation vs. Chapter

| Term | Definition |
|------|------------|
| **Conversation** | One user ↔ character exchange (e.g., talking to Wire) |
| **Session** | All conversations from site open to "End Session" |
| **Chapter** | One session narrativized into prose |

**Rule:** One session = one chapter. Multiple conversations within a session are woven together.

---

## Voice Skill Reference

The Writing Engine uses **Caleb's Third-Person Fiction Voice** for prose generation.

**Location:** `/docs/caleb-third-person-voice.md` (to be added)

**Key principles from the voice skill:**
- Measured but alive — sentences have momentum
- Show the thinking — characters reveal how they arrive at conclusions
- Spare existential weight — stakes matter but aren't announced
- Playful precision — exact word choice, unexpected analogies
- Fluency with abstraction — ineffable concepts get concrete, image-rich language

**Sentence patterns:**
- Declarative punch: "She had no plan. She had momentum."
- Self-correction: "He assumed, foolishly, that the pattern would hold."
- Concrete grounding: "The air smelled of ozone and regret."

---

## API Endpoints

### POST /api/writing-engine/generate

Generates a chapter from a session's transcripts.

**Request:**
```json
{
  "sessionId": "uuid",
  "transcripts": [
    {
      "character": "Wire",
      "timestamp": "2026-01-07T20:30:00Z",
      "transcript": [
        {"speaker": "wire", "text": "Kia ora. Been here long time..."},
        {"speaker": "user", "text": "What happened to the owner?"},
        ...
      ]
    },
    {
      "character": "Eddie",
      "timestamp": "2026-01-07T20:45:00Z", 
      "transcript": [...]
    }
  ],
  "previousChapters": ["Chapter 1 text...", "Chapter 2 text..."],
  "userPreferences": {
    "chapterLength": "medium",  // short (~1000 words), medium (~2000), long (~3500)
    "embellishmentLevel": "moderate"  // minimal, moderate, rich
  }
}
```

**Response:**
```json
{
  "chapterId": "uuid",
  "chapterNumber": 3,
  "title": "The Night Chef's Warning",
  "content": "The hallway stretched before them, dim and endless...",
  "wordCount": 2341,
  "charactersIncluded": ["Wire", "Eddie"],
  "generatedAt": "2026-01-07T21:00:00Z"
}
```

### GET /api/chapters

Returns all chapters for a user.

### GET /api/chapters/{chapterId}

Returns a specific chapter.

---

## LLM Configuration

**Model:** Claude Opus 4.5 (claude-opus-4-20250514)

**Why Opus:**
- Best literary quality
- Follows complex voice prompts precisely
- Long context for previous chapters (RAG-lite)
- Handles nuanced embellishment well

**System Prompt Structure:**
```
1. Voice Skill (Caleb's third-person fiction voice)
2. Story World Context (hotel, characters, relationships)
3. Previous Chapters (last 2-3 for continuity)
4. Current Session's Transcripts (actual dialogue)
5. Embellishment Instructions
6. Chapter Length Guidelines
```

---

## Frontend Components

### Session Tracking
```javascript
// On site load
const SESSION_ID = sessionStorage.getItem('hearsay_session') 
  || crypto.randomUUID();
sessionStorage.setItem('hearsay_session', SESSION_ID);
```

### End Session Button
- Appears after first conversation
- "End Tonight's Session" or similar
- Triggers chapter generation
- Shows "Your chapter is being written..." 
- Can take 30-60 seconds (Opus is thorough)

### /chapters Page
- List of generated chapters
- Reading view with nice typography
- "Your story so far..."
- Downloadable as PDF/EPUB (future)

---

## Embellishment Guidelines

The Writing Engine doesn't just transcribe — it embellishes:

**What the engine adds:**
- Setting details (hallway sounds, lighting, carpet texture)
- Character thoughts (what they were thinking but didn't say)
- Pre-scene context (what character was doing before arriving)
- Post-scene hints (where character went after)
- Sensory details (smells, sounds, textures)
- Other characters' activities (Eddie in the kitchen, Dotty watching from her doorway)

**What the engine preserves:**
- User's actual dialogue (may be polished but not changed)
- Character's actual responses
- Key information revealed
- Emotional beats of the conversation

---

## Data Flow

```
1. User has conversations → Transcripts stored in localStorage
                           (tagged with SESSION_ID)

2. User ends session → Bundle transcripts
                      → POST to /api/writing-engine/generate

3. Backend receives → Fetches voice skill prompt
                    → Fetches previous chapters (RAG)
                    → Constructs prompt for Opus
                    → Sends to Anthropic API

4. Opus generates → Chapter text returned
                  → Stored in database
                  → User notified

5. User views → /chapters page
              → Read their personalized novel
```

---

## Future Enhancements

### RAG for Consistency
- Embed all chapters with character references
- Query relevant past events when generating new chapters
- Maintain world state (who knows what, what's been revealed)

### Multi-Session Story Arcs
- Track overall story progress
- Generate "Previously on THE KNOCK" summaries
- Build toward climax across many sessions

### User Choices
- Let users flag memorable moments
- Choose which conversations to include in chapter
- Adjust embellishment level

### Export
- Download full novel as PDF/EPUB
- Print-on-demand integration
- Share individual chapters

---

## Implementation Phases

### Phase 0: Documentation (current)
- [x] Architecture document
- [ ] Add voice skill to repo
- [ ] Update README

### Phase 1: Session Tracking
- [ ] Generate SESSION_ID on site load
- [ ] Tag transcripts with SESSION_ID  
- [ ] Persist across conversations

### Phase 2: End Session Flow
- [ ] Add "End Session" button
- [ ] Bundle transcripts for session
- [ ] Loading state while generating

### Phase 3: Backend Endpoint
- [ ] POST /api/writing-engine/generate
- [ ] Claude Opus 4.5 integration
- [ ] Voice skill prompt construction
- [ ] Chapter storage

### Phase 4: Chapters Page
- [ ] /chapters route
- [ ] List view of chapters
- [ ] Reading view
- [ ] Typography and styling

### Phase 5: Polish
- [ ] Previous chapters as context (RAG-lite)
- [ ] User preferences
- [ ] Error handling
- [ ] Loading states

---

## Rollback Point

**Tag:** `v1.0-working-app`

If Writing Engine implementation breaks the main app:
```bash
git checkout v1.0-working-app
```

This returns to the fully functional app before Writing Engine changes.

---

## References

- Voice Skill: `/docs/caleb-third-person-voice.md`
- Simli Integration: `/docs/SIMLI_INTEGRATION.md`
- Character Bible: `/docs/CHARACTER_BIBLE.md`
- Project Description: `/docs/PROJECT_DESCRIPTION.md`

