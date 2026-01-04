# HEARSAY

> Unreliable narrators, reliable conversations.

## Project Overview

A platform for conversational narrative experiences delivered through AI-driven talking heads. Each experience places the user in a role that requires listening, questioning, and assembling meaning from contradictory or incomplete testimony. There are no puzzles to solve, no correct answers, no win states. The user is not a player. They are a witness, an editor, an interpreter.

The format draws from oral history, documentary film, and theater. The closest analog might be verbatim theater or the Studs Terkel mode of interview-as-literature, but interactive and open-ended. The user speaks to characters. The characters respond. What accumulates is not a solution but a document: a version of events shaped by which questions the user asked and which answers they believed.

This is an exploratory project. We are feeling out what it wants to be. Some experiences may lean toward mystery. Some will be novelistic and literary. Some will remain entirely unresolved by design. The platform should be flexible enough to accommodate all of these modes.

---

## What This Is Not

- Not a murder mystery. The user is not trying to identify a killer.
- Not an escape room. Nothing to solve, no code to crack, no way out.
- Not a branching narrative. The user does not choose paths. They converse.
- Not a game in the sense of competition or optimization. No score. No best ending.

This is closer to reading a novel made of oral histories, except the user decides which chapters to read, in what order, and when to stop. The meaning is not hidden. It is constructed, by the user, from what they heard.

---

## Terminology

These are not games. Calling them games invites wrong expectations. Possible terms:

- Conversational fictions
- Interview theater
- Witness experiences
- Oral history simulations
- Listening games (if "game" must be used)

For now: **"experience."**

---

## Platform Hierarchy

```
HEARSAY (platform)
├── THE KNOCK       ← Current experience (peephole conceit, Room 412)
├── The Gallery     ← Future (portrait frames)
├── The Waiting Room← Future (intake window)
├── The Séance      ← Future (dark mirror)
└── ...
```

## The Locked Door Conceit

User is in Room 412 and may or may not be able to leave. This is deliberately ambiguous. Characters should occasionally reference it:
- "Have you tried your door lately?"
- "Some guests prefer to stay in their rooms."

**Interface language:** "Who would you like to invite to your door?" (Characters are invited, not selected)

Each experience includes:

- A framing role for the user (documentarian, hotel guest, intake coordinator, etc.)
- A set of characters the user encounters
- A central ambiguity that characters describe differently
- A hint system that surfaces new threads as user progresses (triggers, not scripted sequence)
- An ending determined by the user (they decide when to stop, file their report, close the case)

---

## First Experience: ROOM 412 (The Knock)

### Premise

The user is a guest at a residential hotel. Long-term guests. Old building. The owner died six months ago under unclear circumstances. The estate is in probate. People keep knocking on your door. Staff. Other guests. People who want something or want to tell you something. You talk to them through the peephole. You decide what to believe.

### Visual Conceit

POV through brass hotel door peephole. Fisheye barrel distortion. Circular frame, heavy vignette to black. The user is inside, in darkness. The visitor is outside, in the hallway, face warped by the lens. Paranoid intimacy. The feeling of 2am, uncertain whether to open.

The hallway has consistent elements across characters: faded floral or damask wallpaper, warm sconce lighting, red EXIT sign glowing in background, patterned carpet.

### User Role

You are a guest. You may be press, police, family of someone involved, an heir, an investigator, or just someone who checked in at the wrong time. The characters will try to figure out what you are. So will you.

### What Happened

The owner died. The official story does not match what people whisper. Room 614 has had the same guest for nine years, someone who never leaves. There is a second set of books. Some staff were paid to not see things. The building has secrets older than the current ownership.

### Tone and Style

Baroque theatrical. Not naturalistic. Stylized strangeness. 

**Visual References:** 
- Tony Duquette (maximalist theatrical fantasy, gilded decay)
- Jan Švankmajer (tactile surrealism, uncanny texture, objects with memory)
- Thom Browne Fall 2012 (theatrical tailoring, anachronistic formality)
- Delicatessen (Jeunet) (sepia warmth, eccentric communities, vertical architecture)
- Tom Waits (gravelly romanticism, carnival after closing)
- Hermanos Gutiérrez (cinematic Americana, dusty grandeur)

Characters dress for decades that do not match. The hotel exists slightly outside normal time. Everything is slightly too ornate, slightly too worn, slightly too alive.

---

## Characters (Room 412)

### WIRE (Wiremu Tūhoe)

Night porter. According to paperwork, eleven years. According to Wire, longer than the current building. Māori, from the East Coast. Bald, long white beard, wears a patterned robe that is not uniform. Looks like a mystic who took a job in hospitality and never left.

**Voice:** NZ accent (11 Labs: Māori male). Speaks like a Richard Brautigan narrator who grew up in Rotorua and spent decades at the track. Mixes Kiwi slang with horse racing idioms. "Yeah nah," "sweet as," "chur." Talks about people like horses, situations like races, outcomes like odds. Time references are slippery.

**Knows:** Owner's death was not natural. Room 614 situation. Second set of books. Has footage. Knows which walls used to be doors.

**Hiding:** Took money once to look away. Footage implicates someone he cares about. Has made copies. How long he has actually been here.

**Wants:** To know who you are before deciding what to tell you. To be taken seriously. To do right by the building.

---

### MARISOL VANCE

House detective. A mostly ceremonial position she treats as sacred duty. Late 30s. Wears a uniform that is not quite military, not quite hotel staff. Hired six years ago by someone who no longer works here for a purpose never explained.

**Voice:** Speaks like a character from a Patricia Highsmith novel who wandered into a Tom Waits song. Formal sentence structure, odd word choices. Mixes hotel hospitality idioms with emergency medical language. Does not use contractions when serious. Answers questions you did not ask.

**Knows:** Layout better than blueprints show. Which rooms connect through sealed doors. Owner's death preceded by unusual requests. Wire keeps records; she keeps records on Wire. Has a key to a room not on any directory. Knew the 614 guest before they checked in.

**Hiding:** Purpose of her hiring. Has never used the key. Not sure if protecting hotel or something inside it.

**Wants:** To know what you already know. To determine if you are complication or opportunity. To finish something that started before you arrived.

---

### Additional Characters (to develop)

- The guest in evening wear who has been here forty years, wants to change rooms, won't say why
- The man who checks in every Thursday, stays one night, leaves before dawn, now wants to extend indefinitely
- The owner's assistant, still living in the hotel, still working, no one paying her
- Someone claiming to be the new owner with paperwork in order but whom no one recognizes

---

## Interstitials

After each character encounter, optional story beats:

- **Envelope under door:** Short video clip, POV, envelope slides under. Handwritten label. Contains USB or note with URL.
- **Text message:** Phone receives text from unknown number. Temp link. Expires soon.
- **Surveillance footage:** Grainy clip of another character doing something unexplained.
- **Voicemail:** Audio only. A character calling back, changing their mind about something.

These are not required. They add texture and connect encounters without requiring backend state.

---

## Visual Frame Options (Platform-Wide)

Different experiences can use different face-to-face conceits:

| Experience | Visual Frame |
|------------|--------------|
| Room 412 | Peephole, fisheye, brass ring, hallway |
| The Portrait Gallery | Gilt frames, faces animate within paintings |
| The Waiting Room | Intake window, plexiglass, institutional |
| The Séance | Dark mirror, scrying screen, faces from black |
| The Automaton | Glass case, fortune teller booth |
| The Confessional | Lattice screen, partial obscurity |
| The Intercom | Buzzer cam, harsh angle, gate/door |
| The Vitrine | Museum case, specimen logic |

The tech is the same. The feeling is different.

---

## Future Experience Concepts

### THE WAKE
Gathering remembrances for a memorial service. The deceased is someone user did not know well. Each character offers different version of who this person was. No crime. No conspiracy. The impossible thing is ordinary: you cannot know another person fully.

### THE WAITING ROOM
User is in a waiting room. Number system. Numbers not called in order. No one remembers how long they have been here. Conversations are aimless but patterns emerge. Ending is deciding to leave or stay. Beckett energy.

### THE NEIGHBORS
Something happened on the street. All neighbors saw it. Processing together on porches. The event is excuse. Real subject is grudges, gossip, long memories.

### THE DOCUMENTARIAN
Making a film about 50th anniversary of something in a small town. No one agrees what they are commemorating. Parade? Disappearance? Miracle?

### THE ARCHIVIST
Cataloging oral histories from the 1960s. Recordings of a mining town that no longer exists. Timestamps don't match. Some interviews reference events that hadn't happened yet.

### THE SHARED DELUSION
Intake interviews at residential facility. Five new patients, different towns, don't know each other. All describe the same dream. Dream has an address. A time. A name.

---

## Sensory Packs (Physical Extension)

Optional physical packs shipped to user. Changes relationship to screen. User holds evidence. Smells the place. Fiction has weight.

### Contents
- **Scent vials:** Environments, not perfumes. "The lobby after hours." "A room closed too long."
- **Unusual candies:** Era-ambiguous, regional. Violet pastilles, horehound drops.
- **Polaroids:** Some to view at specific moments. Some ambiguous.
- **Paper ephemera:** Matchbooks, business cards, receipts, hand-drawn maps.
- **Small objects:** A key, a button, a swatch of fabric. No explanation.

### Tiers
- **Basic:** Polaroid, one scent card, paper ephemera, candy
- **Deluxe:** Multiple scents, instant camera, more objects, designed box

---

## Technical Notes

### Current Constraints
- Simli widget SDK, system-prompt-only
- No backend state tracking across characters
- Characters cannot know what other characters told the user
- User must be the state (they remember, they bring things up)

### Future (with LiveKit + backend)
- Cross-character state: Character B responds to what Character A revealed
- Unlockable content based on discoveries
- Accusation/solution mechanic for mystery-leaning experiences
- Multiplayer: different users get different witnesses, must compare notes

### Hint System
Time-released, not content-conditional. After N conversations, a hint surfaces. Hints pulled from pool, not fixed sequence. Different playthroughs surface different threads.

---

## The Writing Engine (Dialogue Harvest → Narrative Pipeline)

### Vision

Every conversation becomes raw material for literature. The user's session—who they spoke to, what they asked, what they learned—is captured and fed to a Writing Agent that transforms it into a narrativized chapter. This is NOT a summary. This is not Otter.ai. This is a fiction-generation engine that uses the actual dialog as the spine of a new literary artifact.

The output reads like a chapter from a novel set in the hotel. It leans heavily on the through-the-door conversations but embellishes beyond them: what happened in the hallway before the knock, what the character did after they walked away, what the user was thinking but didn't say. The dialog is the skeleton. The Writing Agent adds the flesh.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER SESSION                                 │
│  Entry → Character 1 dialog → Character 2 dialog → ... → Exit       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TRANSCRIPT CAPTURE                                │
│  Simli's createTranscript: true → session_transcript returned       │
│  OR: LiveKit webhook → captures both sides of conversation          │
│  Trigger: session end (exit, timeout, explicit "end" action)        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WRITING AGENT                                     │
│  Model: Claude Opus 4.5 (or Kimi K2 for cost optimization)          │
│  Custom .skill file: author's voice, tone, style samples            │
│  Input: raw transcript + character bible + session metadata          │
│  Output: narrativized chapter (1000-3000 words)                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CHAPTER DELIVERY                                  │
│  Email to user (optional)                                           │
│  Personal "journal" page on site                                    │
│  PDF/EPUB export                                                    │
│  Contribute to collective novel (anonymized, opt-in)                │
└─────────────────────────────────────────────────────────────────────┘
```

### Transcript Capture

**Option A: Simli's Built-in Transcription**
- When fetching token, include `createTranscript: true`
- Simli returns transcript at session end
- Limitation: may only capture character speech, not user speech

**Option B: LiveKit Direct Integration**
- Bypass Simli's abstraction, connect directly to LiveKit room
- Full control over audio streams, both sides captured
- More complex, more powerful

**Option C: Browser-Side Capture**
- Use Web Audio API to capture microphone input
- Combine with Simli's character responses
- Client-side assembly of full dialog

**Session Boundary Detection:**
- User clicks "End Conversation" or "Leave Room"
- Inactivity timeout (5 minutes of silence)
- User closes browser/tab (beacon API for reliable capture)
- User clicks "Begin Writing" (explicit trigger)

### Writing Agent Architecture

**Model Candidates:**
- **Claude Opus 4.5** — Best for literary quality, supports .skills for custom voice
- **Kimi K2** — Cheaper, good for iteration/testing, may lack nuance
- **Hybrid** — Prototype with Claude, scale with Kimi, A/B test quality

**Custom Writing Skill (.skill file):**
Contains:
- Author's style samples (prose excerpts, 5-10 examples)
- Vocabulary preferences (words to use, words to avoid)
- Narrative conventions (POV, tense, sentence rhythm)
- Embellishment guidelines (how far beyond the door to imagine)
- Character voice references (so Writing Agent can voice them consistently)

**Prompt Structure:**
```
You are a literary fiction writer working in the style of [author references].

You have received a transcript of a conversation that took place through a hotel door peephole. The user is in Room 412. They cannot leave. A character approached their door and they spoke.

Your task: Transform this transcript into a chapter of literary fiction.

RULES:
1. Use the actual dialog as the spine. Do not summarize. Include the words spoken.
2. Embellish beyond the door: What was the character doing before they knocked? What did they do after they walked away? What was the user thinking but didn't say?
3. Add sensory detail: The hallway carpet, the brass peephole, the distorted fisheye view.
4. Maintain the character's voice as established in their bible.
5. The user is never named. They are "you" or described obliquely.
6. Length: 1500-2500 words.
7. End with the character departing, or the user choosing to stop listening.

TRANSCRIPT:
[raw dialog here]

CHARACTER CONTEXT:
[relevant character bible excerpt]

SESSION METADATA:
- Duration: X minutes
- Time of day (in-fiction): [derived from system]
- Previous characters spoken to this session: [list]
```

### What the Writing Agent Adds

The harvested dialogue is the skeleton. The Writing Agent adds:

- **Pre-knock scene:** The character in the hallway before approaching. Their hesitation. Their purpose.
- **User's interiority:** What the user might have been thinking. Their paranoia, curiosity, suspicion.
- **Sensory texture:** The smell of the hallway, the quality of light through the peephole, the muffled sounds from other rooms.
- **Post-conversation beat:** The character walking away. The user's silence after. The weight of what was said.
- **Thematic resonance:** Drawing connections to hotel lore, to other characters, to the larger mystery.

### Output Formats

**Immediate (per-conversation):**
- "Chapter" emailed to user
- Appears in user's personal "journal" on site
- Can be downloaded as PDF

**Cumulative (per-session):**
- Multiple conversations woven into single chapter
- Transitions between characters handled narratively

**Collective (opt-in):**
- Anonymized chapters contribute to "The Hotel Manuscript"
- A collective novel written by all users
- Curated/edited by author or AI

### Technical Implementation Steps

1. **Enable Simli Transcription**
   - Already passing `createTranscript: true` in token request
   - Add webhook/callback to receive transcript at session end
   - Store in database (or simple file for MVP)

2. **Session Management**
   - Define session boundaries (entry to explicit end, or timeout)
   - Track which characters were spoken to
   - Capture session metadata (duration, order, timestamps)

3. **Writing Agent Endpoint**
   - New backend route: `POST /api/generate-chapter`
   - Accepts: transcript, character_id, session_metadata
   - Calls Claude/Kimi API with custom prompt
   - Returns: narrativized chapter

4. **Custom Voice Training**
   - Create .skill file with author style samples
   - Test output quality, iterate on prompt
   - Potentially fine-tune on author's existing work

5. **Delivery System**
   - Email integration (SendGrid, Resend, etc.)
   - User accounts (optional, could be email-only)
   - Chapter storage and retrieval

### Open Questions

- **User consent:** Do we capture all conversations by default? Opt-in only?
- **Privacy:** Are transcripts stored permanently? Deleted after chapter generation?
- **Editing:** Can users edit their chapters before publishing to collective?
- **Timing:** Generate chapter immediately on session end, or batch nightly?
- **Multi-session:** Does each visit create a new chapter, or do we merge visits into an evolving narrative?

---

## Development Principles

1. **Flexibility over formula.** Some experiences may resolve. Some never will. The platform accommodates both.

2. **Literary voice matters.** System prompts should reference authors, mix idioms, avoid vanilla LLM output. Each character should have a voice that could not be anyone else.

3. **Physical and digital may merge.** Sensory packs, installation versions, site-specific performance are all on the table.

4. **Start simple, layer complexity.** First build is system-prompt-only. Backend state comes later if needed.

5. **The user constructs meaning.** No solution to find. No correct interpretation. What they assemble from conversations is the experience.

---

## Title Options Considered

| Title | Notes |
|-------|-------|
| Hearsay | Foregrounds unreliability. Current choice. |
| Parlor | Old-fashioned, intimate, hints at parlor games. |
| Deposition | Clean, legal connotation. |
| The Vestibule | In-between quality. |
| Earshot | Proximity, listening, incomplete information. |

---

*Private project. Not for distribution.*


