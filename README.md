# AccessCare Navigator

**Find specialists who actually meet your accessibility needs, then book the visit or get a call script that does the advocating for you.**

People with disabilities pay a "disability tax": hours spent phoning clinic after clinic just to learn whether the exam room fits a wheelchair, whether the table lowers, or whether an ASL interpreter will be there. AccessCare Navigator does that checking up front. You describe your needs once. The app scores every clinic in the chosen specialty against them, explains each match in plain language, and then either:

- **books a slot** (simulated) at clinics that take online booking, or
- **writes a first-person phone script** ("Advocacy Script") built from your own needs, plus a downloadable `.ics` calendar reminder to make the call.

The interface is accessibility-first: full keyboard support, visible focus everywhere, a label on every input, live regions for async status, an error summary that links to each field, 44 px+ touch targets, and WCAG AA or better contrast (most text is AAA). It respects `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast` and forced-colors mode.

### Care Guide: chat or talk, with medical documents (`/guide`)

A conversational assistant for people who'd rather talk it through than fill in a form.
- **Reads your PDFs.** Upload referral letters, visit summaries, test results or an insurance card: up to 3 per message, 10 MB each, 6 per conversation. Claude reads each one natively as a PDF. It explains in plain words what matters for booking ("your referral is to neurology") and confirms any accessibility needs it finds before using them.
- **Acts with tools.** It runs a real tool-use loop on the server, up to 6 rounds per reply:
  - `find_clinics` searches the same directory and scoring as the form, with open slots labelled in your time zone.
  - `book_appointment` makes a simulated booking. It works only at online-booking clinics, only for a listed slot, and only after you've said yes.
  - `show_call_script` writes a script for phone-only clinics, with copy, listen and remind-me buttons.
  - `add_to_calendar` shows a Google Calendar / .ics card. You press it to save.

  Every tool result appears as a card in the chat, and the model is told never to invent clinics, times or features.
- **Voice conversation.** Press **Start voice conversation** and talk hands-free. It listens, sends what you said, reads the reply aloud in your language, then listens again. You can stop it speaking or end the conversation at any time. **Read replies aloud** speaks replies even while you type. A mic button on the message box also lets you dictate.
- **Context without accounts.** The conversation stays in the browser tab and is re-sent each turn. Each reply carries a short note of what its tools returned (clinic ids, slots, confirmations), so later turns still know about them. If you've used the search form, the guide already knows your name, insurance and needs.
- **Same safety rules.** It's not a doctor, it never diagnoses, it suggests a general physician when unsure, and emergencies get a call-911 answer first. With no AI configured, it says so plainly in your language and points you to the form.

### Email and text drafts for clinics

Choose **Email or text clinic** on a results card, or ask the Care Guide to draft a message. Review and edit the subject and body, copy the text, or listen to it aloud. Opening your email or messaging app carries over your edits; you press Send there. Clinic addresses use the reserved .example domain and the directory is fictional. All six languages include template drafts when AI is unavailable.

The Care Guide uses draft_message to display the same editable card. It is instructed to use only personal facts you supplied.

### Symptoms-first Care Guide

Describe symptoms to get clinic matches and a **While you wait** card through show_self_care, with practical self-care tips and warning signs. The guide can search before asking for insurance, then asks a booking question. Emergency symptoms receive emergency guidance first. Self-care is not a diagnosis or a substitute for professional care.

### Six languages, end to end

**English, Español, 中文 (Mandarin, Simplified), Tiếng Việt, Français, हिन्दी.** Use the header picker or the Display panel. The first visit follows the browser's language, and your choice is remembered in the browser.
- Every interface string is translated. The dictionaries in `lib/i18n/` are type-checked against English, so a missing string fails the build.
- The AI writes clinic explanations, call scripts, specialist suggestions and Care Guide replies in your language.
- The fallback templates used when no AI is available are translated too, including the full call script.
- Voice typing and read-aloud switch to the matching speech locale (`es-US`, `zh-CN`, `vi-VN`, `fr-FR`, `hi-IN`) and pick a matching voice.
- Dates and times use your language's format.
- The no-AI emergency safety net recognizes red-flag phrases in all six languages.
- Spoken durations ("dos semanas", "两周") and specialty names in each language are understood.

### "Which specialist should I see?"

People often don't know which kind of doctor to book. Describe your symptoms in your own words and choose **Suggest the right specialist**. Claude reads the whole description, including negations ("no chest pain"), how long it has gone on, age, pregnancy and past diagnoses. It then picks the best first stop from the ten specialties, **selects it in the form for you** and explains why in plain language. It gives a confidence level, up to two alternatives you can switch to in one click, and an urgency check:
- **Emergency:** a prominent "call 911 / go to the ER now" banner.
- **Urgent:** the time window narrows to 3 days.

You can always choose something else.

- **Not keyword matching.** The model reasons over the text, and its answer must fit a strict JSON schema (enforced through structured outputs on the Anthropic API). The specialty must come from our list. Anything malformed is discarded, never half-trusted.
- **Conservative when unsure.** Vague, multi-system or thin descriptions go to **Primary Care** with low confidence. With no AI available, the app doesn't guess: it recommends a general physician, and a small red-flag safety net still raises the emergency banner for signs like chest pain or stroke symptoms.
- **Clear disclaimer, every time.** The suggestion says it is *not a diagnosis or medical advice*. It recommends checking with a general physician or your own doctor before booking a specialist, notes that some plans require their referral, and repeats the 911 guidance. The footer repeats it site-wide.

### Voice typing in every field

Every text box, plus the specialty and days fields, has a **microphone button** beside it, for people who are blind or can't type comfortably. It uses the browser's built-in speech recognition (Chrome, Edge and Safari; the button is hidden where it isn't supported).
- **Reason for visit:** keeps listening until you stop, and adds to anything already typed.
- **Short fields:** fill after one phrase.
- **Spoken values are cleaned up:**
  - Names are capitalized.
  - "A E T dash 4417" becomes `AET-4417`.
  - "two weeks" becomes 14.
  - "family doctor" selects Primary Care.
- **Screen readers:** the button announces its state ("Speak your name" / "Stop voice typing"), and listening status is read out. Focus returns to the field afterwards.
- **No clashes:** starting dictation stops read-aloud so it doesn't talk into the mic, and only one mic can be on at a time.

### Built-in accessibility tools (no account needed)

The **Display** button in the header opens a panel. Everything in it is saved in the browser's `localStorage` and applied before the first paint, so the page never flashes the wrong theme.

| Tool | What it does |
|---|---|
| **Read aloud** | Uses the browser's own speech engine (Web Speech API). Reads the page, or the open dialog, block by block. It highlights each part and scrolls it into view as it's read, and announces checkbox states and field values. A floating player offers pause, resume and stop. You can choose the speed and the voice. The call script has its own **Listen to script** button so people can practise before calling. |
| **Color themes** | **Night** (the default), **Day** (a light background for people who find dark themes hard to read) and **High contrast** (black, white and yellow, with no transparency, thicker focus rings and solid borders). |
| **Text size** | Four steps, from 100 % to 150 %. The layout is built in `rem`, so the whole page scales with the text. |
| **Easier-to-read font** | Atkinson Hyperlegible, a font designed for low vision, with the wider letter, word and line spacing from WCAG 1.4.12. |
| **Reduce motion** | The same effect as the OS setting, available even when the OS setting is off. Movement becomes short fades. |

### Google Calendar (stored in your browser)

There are no accounts, so a Google Calendar connection is saved only in the browser's `localStorage`. **Disconnect and forget** revokes the token and deletes it.
- **When connected:** confirmed bookings and call reminders go onto your calendar in one click. The booking dialog checks each opening against your free/busy times and marks any that clash.
- **Without setup:** every "Add to Google Calendar" button opens Google Calendar with the event already filled in, so nothing needs configuring. An `.ics` download is always offered for Apple Calendar, Outlook and other apps.

To turn on one-click connect, set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (see below). The access token is short-lived (about 1 hour) and is renewed through Google's own popup when needed. It stays in browser storage, which is acceptable for a demo but not something to copy into production.

---

## ⚠️ Demo boundary: what's real and what's simulated

| Part | Status |
|---|---|
| Clinic data (15 clinics, 10 specialties) | **Fictional.** Hand-written in [`data/clinics.json`](data/clinics.json). Names, addresses and `555-01xx` phone numbers are made up. |
| Booking | **Simulated.** Picking a slot shows a mock confirmation number. No clinic or external site is contacted. |
| Phone calls | **None.** The app writes a script; you make the call. |
| Insurance check | **Name match only** against each clinic's listed networks. Not real verification. |
| Match scoring | **Real**, deterministic logic in [`lib/matching.ts`](lib/matching.ts). |
| Match explanations and call scripts | **Real AI text** from Claude (AWS Bedrock, or the Anthropic API as a fallback) when keys are set. With no keys, hand-written templates fill in, and the UI says which source you're seeing. |
| Storage | **None server-side.** Results are passed between pages in `sessionStorage` and vanish when the tab closes. |

Appointment slots are written relative to 2026-11-01 and shifted at load time so they're always in the near future, whenever you run the app.

---

## Run it

Requires Node.js 18.17+.

```bash
npm install
cp .env.example .env.local   # optional, see below
npm run dev
```

Open http://localhost:3000 and click **Use a sample patient** for a ready-made walkthrough (Neurology, Aetna, four accessibility needs).

### AI keys (optional)

**The app runs fully with no keys.** Every AI call falls back to a template, so the demo can't break. To get real AI text, fill in `.env.local`:

| Variable | Purpose |
|---|---|
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | Primary provider: Claude on AWS Bedrock. In the AWS console go to **Bedrock → Model access** and enable the Claude model **for that region** before the first call. |
| `BEDROCK_MODEL_ID` | Optional. Defaults to `anthropic.claude-opus-5-5`. Some regions need an inference-profile ID instead, e.g. `us.anthropic.claude-opus-5-5`. |
| `ANTHROPIC_API_KEY` | Optional fallback: the direct Anthropic API ([console.anthropic.com](https://console.anthropic.com)). |
| `ANTHROPIC_MODEL` | Optional. Defaults to `claude-opus-5-5`. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional: one-click Google Calendar. In Google Cloud Console, enable the **Google Calendar API**. Configure the **OAuth consent screen** (External, Testing, and add yourself as a test user). Then create **Credentials → OAuth client ID → Web application** with `http://localhost:3000` as an Authorized JavaScript origin. |

The order is **Bedrock → Anthropic API → template**. Each call has a 20 s timeout. A failure, timeout or model refusal drops to the next tier, and the reason is logged in the server console.

---

## How it works

```
Intake form ──POST /api/match──▶ filter by specialty
                                  score = 50·inNetwork + 50·(needs met / needs requested)
                                  top 5 → Claude writes a 1-2 sentence explanation (in parallel, Promise.allSettled)
                                  rest → templated explanation
           ◀── ranked MatchResult[] (stored in sessionStorage)

Results ── online booking? ──▶ BookingModal: pick slot → mock CONF-XXXXXX
        └─ phone only / "just a script" ──POST /api/advocacy-script──▶ Claude writes a first-person script
                                                                    + client-side .ics reminder (next weekday, 10:00)
```

| Path | What's there |
|---|---|
| `app/page.tsx`, `components/IntakeForm.tsx` | Accessible intake form, client-side validation, error summary |
| `app/results/page.tsx`, `components/ClinicCard.tsx` | Ranked results, score ring, met/unmet checklist, per-clinic action |
| `components/BookingModal.tsx`, `components/AdvocacyScriptModal.tsx`, `components/Dialog.tsx` | Native `<dialog>` modals with symmetric enter/exit motion |
| `app/api/match/route.ts`, `app/api/advocacy-script/route.ts` | Server routes (credentials never reach the browser) |
| `lib/matching.ts` | Pure filter and scoring functions |
| `lib/ai-client.ts` | Bedrock → Anthropic → template chain, prompts, template text |
| `lib/ics.ts` | Hand-rolled RFC 5545 `.ics` builder |
| `lib/validate.ts` | Request-body checks (no schema library) |
| `data/clinics.json` | The mocked dataset |
| `components/A11yProvider.tsx`, `lib/prefs.ts` | Display preferences and the read-aloud engine |
| `components/AccessibilityPanel.tsx`, `components/ReadAloudBar.tsx` | The Display panel and the floating speech player |
| `lib/google-calendar.ts`, `components/CalendarProvider.tsx`, `components/CalendarActions.tsx` | Browser-only Google Calendar connection, free/busy checks, and the pre-filled-link fallback |
| `components/ScrollEffects.tsx` | Scroll-triggered reveals and the header's scroll state |
| `lib/triage.ts`, `app/api/suggest-specialty/route.ts`, `components/SuggestionCard.tsx` | Specialist suggestion: prompt, JSON schema, validation, safe fallback, UI and disclaimer |
| `lib/voice.ts`, `components/VoiceInput.tsx` | Voice typing: browser speech recognition and spoken-value cleanup |
| `lib/care-guide.ts`, `app/api/chat/route.ts` | Care Guide: tools, system prompt, tool-use loop, PDF/size validation |
| `app/guide/page.tsx`, `components/CareGuide.tsx`, `components/GuideActionCard.tsx` | Chat UI, PDF attachments, hands-free voice conversation, tool-result cards |
| `lib/i18n/*.ts`, `components/I18nProvider.tsx` | Dictionaries for 6 languages (type-checked against English) and the language context |
| `lib/booking.ts` | Simulated booking shared by the dialog and the Care Guide |

**Choices that differ slightly from a literal reading of the plan:**
- Insurance is **scored, not hard-filtered**. A payer that isn't listed still gets results, clearly flagged "Out-of-network — verify", instead of an empty page.
- `MatchResult` carries two extra fields: `slotsInWindow`, the number of openings inside your urgency window, which is used for tie-breaks and badges, and `explanationSource`, so the UI can say honestly whether text came from AI or a template.
- At clinics with online booking, the non-preferred action stays available as a secondary button, so you can always choose.

### Design

The theme is a quiet Halloween night called "Harvest Moon": a plum-black sky with a static moon glow and a few stars, a pumpkin-lantern accent and candlelight text. Surfaces are frosted glass with crisp corners of 2–4 px and no pill shapes. Each pane catches light along a fine gradient edge. Because the glowing sky behind stays fixed while content scrolls over it, the tint of each pane shifts as you scroll. Content materializes as it scrolls into view, and the header's material thickens once the page moves.

Motion follows Apple's fluid-interface guidance:
- Press feedback appears on pointer-down.
- Entrances materialize (opacity, a small rise and an un-blur) along critically damped curves, with no overshoot.
- A dialog leaves along the same path it came in on, and reopening one mid-exit cancels the close.
- Only `transform`, `opacity` and `filter` are animated, and nothing moves across the full viewport.

Under reduced-motion settings, every movement becomes a short cross-fade.

---

## Hackathon rubric

- **Practicality:** It replaces the most draining part of booking care, the verification calls, with one form. It works on a phone, needs no account, and degrades gracefully with no AI keys.
- **Creativity:** A two-path ending, *book it for me* or *arm me for the call*, respects user autonomy. The Advocacy Script turns a stressful conversation into something to read aloud, with yes/no questions for each need.
- **Significance:** About 1 in 4 US adults lives with a disability, and inaccessible equipment and communication are documented barriers to care. The tool targets that gap directly.
- **Technical complexity:** A deterministic matching engine. A three-tier AI chain (Bedrock → Anthropic → template) with timeouts, refusal handling and parallel `Promise.allSettled` generation. Server-only credential handling. A hand-rolled `.ics` generator. A full accessibility layer built without a UI library.

---

> **Reminder:** this repo starts **private**. If the hackathon needs a public link, switch it in GitHub **Settings → General → Danger Zone → Change visibility** before the 3 pm deadline.

Voice conversations support interruption: the microphone remains active during replies and thinking. Speaking stops playback and supersedes a pending reply. Recognition restarts between utterances automatically; Stop speaking returns directly to listening. Headphones are recommended to reduce speaker echo. This uses browser speech recognition and synthesis, so voice quality, pause detection, and latency depend on the browser; it is not a native realtime audio model.
