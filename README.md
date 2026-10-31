# AccessCare Navigator

**Find specialists who actually meet your accessibility needs, then book the visit or get a call script that does the advocating for you.**

People with disabilities pay a "disability tax": hours spent phoning clinic after clinic just to learn whether the exam room fits a wheelchair, whether the table lowers, or whether an ASL interpreter will be there. AccessCare Navigator does that checking up front. You describe your needs once. The app scores every clinic in the chosen specialty against them, explains each match in plain language, and then either:

- **books a slot** (simulated) at clinics that take online booking, or
- **writes a first-person phone script** ("Advocacy Script") built from your own needs, plus a downloadable `.ics` calendar reminder to make the call.

The interface is accessibility-first: full keyboard support, visible focus everywhere, a label on every input, live regions for async status, an error summary that links to each field, 44 px+ touch targets, and WCAG AA or better contrast (most text is AAA). It respects `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast` and forced-colors mode.

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
