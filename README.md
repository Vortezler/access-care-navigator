# AccessCare Navigator

**Find specialists who actually meet your accessibility needs, then book the visit or get a call script that does the advocating for you.**

People with disabilities pay a "disability tax": hours spent phoning clinic after clinic just to learn whether the exam room fits a wheelchair, whether the table lowers, or whether an ASL interpreter will be there. AccessCare Navigator does that checking up front. You describe your needs once. The app scores every clinic in the chosen specialty against them, explains each match in plain language, and then either:

- **books a slot** (simulated) at clinics that take online booking, or
- **writes a first-person phone script** ("Advocacy Script") built from your own needs, plus a downloadable `.ics` calendar reminder to make the call.

The interface is accessibility-first: full keyboard support, visible focus everywhere, a label on every input, live regions for async status, an error summary that links to each field, 44 px+ touch targets, and WCAG AA or better contrast (most text is AAA). It respects `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast` and forced-colors mode.

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

**Choices that differ slightly from a literal reading of the plan:**
- Insurance is **scored, not hard-filtered**. A payer that isn't listed still gets results, clearly flagged "Out-of-network — verify", instead of an empty page.
- `MatchResult` carries two extra fields: `slotsInWindow`, the number of openings inside your urgency window, which is used for tie-breaks and badges, and `explanationSource`, so the UI can say honestly whether text came from AI or a template.
- At clinics with online booking, the non-preferred action stays available as a secondary button, so you can always choose.

### Design

The theme is a quiet Halloween night called "Harvest Moon": a plum-black sky with a static moon glow and a few stars, a pumpkin-lantern accent and candlelight text. Motion follows Apple's fluid-interface guidance:
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
