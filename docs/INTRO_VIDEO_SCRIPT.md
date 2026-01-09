# THE KNOCK — Intro Video Script

**Duration:** 45-60 seconds  
**Tone:** Mysterious, inviting, slightly unsettling  
**Purpose:** Orient first-time users without spoiling the experience

---

## SCRIPT (V1)

**[VISUAL: Dark screen. Slow fade in on the peephole view — the brass ring, the hallway beyond.]**

**NARRATOR (V.O.):**
> Someone is at your door.

**[VISUAL: A figure approaches in the hallway. Slightly out of focus.]**

> They have something to tell you.  
> Whether you believe them is up to you.

**[VISUAL: The peephole view. The figure waits.]**

> This is THE KNOCK.  
> A HEARSAY experience.

**[VISUAL: Cut to the character gallery — faces orbiting the peephole.]**

> You're in Room 412.  
> You can't remember how you got here.  
> People keep coming to your door.

**[VISUAL: Show a character being selected. The walkup video plays.]**

> Click a face to invite them to speak.  
> They'll approach. You'll talk through the door.  
> They can hear you. You can hear them.

**[VISUAL: Brief glimpse of a character speaking through the peephole.]**

> What they tell you may or may not be true.  
> That's the thing about hearsay.

**[VISUAL: Fade to the "End Session" button.]**

> When you're done for the night, end your session.  
> Your conversations become a chapter.  
> Your chapter becomes part of a story.

**[VISUAL: Return to the rotating sign — "MANE NOBISCUM" / "STAY WITH US"]**

> Someone's knocking.  
> Will you answer?

*[beat]*

> We hope you'll stay with us.

**[VISUAL: Door slowly closes. "BEGIN" button appears.]**

*Note: "Stay with us" carries three meanings — stay at the hotel, keep playing, and... don't end up like the previous owner.*

---

## DESIGN NOTE: Summoned vs. Unbidden Characters

### Current: User Selects
User browses gallery, clicks a face, character approaches.

### Future: Unbidden Knocks
Characters knock on their own. User doesn't choose — they respond.

### Hybrid (Recommended)
- **Some characters knock unbidden** — notification/sound, user accepts or ignores
- **Some can be summoned** — gallery still available
- **Rare characters ONLY appear unbidden** — Ghost of Vance, special events
- **Time-based logic** — Tane at night, Eddie around dinner, Dotty afternoon

**Implementation would require:**
- Random timer system
- Notification UI ("Someone's at the door...")
- Accept/Ignore buttons
- Logic to prevent interrupting active conversations

**Narrative benefit:** Feels less like a menu, more like *they* found *you*.

---

## ALTERNATE SHORTER VERSION (30 seconds)

**[VISUAL: Peephole view.]**

**NARRATOR (V.O.):**
> Someone is at your door.  
> They have something to tell you.

**[VISUAL: Character gallery.]**

> Click a face. They'll come to your door.  
> Talk. Listen. Decide what to believe.

**[VISUAL: Character at the peephole.]**

> This is THE KNOCK.  
> A HEARSAY experience.

**[VISUAL: Return to rotating sign — "STAY WITH US"]**

> Someone's knocking. Will you answer?  
> We hope you'll stay with us.

---

## HOW TO MAKE THE VIDEO

### Option 1: Screen Recording (Recommended for MVP)

**Tools:**
- **Mac:** QuickTime Player → File → New Screen Recording
- **Show cursor:** System Preferences → Accessibility → Display → Cursor → "Shake mouse pointer to locate" OR use a tool like **Cursor Pro** or **ScreenFlow**

**Steps:**
1. Open the site in full screen
2. Start recording with QuickTime
3. Slowly navigate: Entry → Landing → Click character → Watch walkup → See character speak
4. Record "End Session" flow
5. Add voiceover in post (GarageBand, Audacity, or just your phone voice memo)

**To show cursor clearly:**
- Use **Cursor Pro** (free, shows a highlight around cursor)
- Or **Mouseposé** (shows click ripples)
- Or **ScreenFlow** has built-in cursor highlighting

### Option 2: Animated Explainer

- Use **Canva** or **CapCut** with screenshots
- Add text overlays instead of voiceover
- More polished, takes longer

### Option 3: Just Text Overlays on Site Footage

- Record the site without voiceover
- Add text cards between clips: "Click a face..." "Talk through the door..." "Your story unfolds..."
- Works well for silent/autoplay social media

---

## VOICEOVER NOTES

**Tone:** 
- Unhurried, like you're telling a secret
- Slightly conspiratorial
- Not dramatic — understated
- Think: late-night radio host, or someone speaking through a door

**Pacing:**
- Pause after key lines
- Let the visuals breathe
- "Someone is at your door." [beat] "They have something to tell you."

**Voice:**
- Could be your voice
- Could be a character (Wire? Caleb?)
- Could be text-only (no VO)

---

## WHERE IT WOULD APPEAR

**First Visit Only:**
- After clicking "Enter" on the heraldic page
- Before showing the character gallery
- "Skip" button available
- Stores flag in localStorage so it doesn't repeat

**Optional:**
- "How to Play" button in About modal that replays it

