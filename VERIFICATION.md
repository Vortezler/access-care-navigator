# Verification — October 31, 2026

## Local repair
Development uses `.next-dev`; production uses `.next`. This prevents concurrent builds from overwriting development chunks. Restarted the project server on http://localhost:3000. Home, results and guide returned HTTP 200 with a production build running.

## Verified
- Production build, lint and TypeScript.
- Live Bedrock: matching explanations (scores 100/75/50 and accommodations match the dataset), call script, email, Spanish SMS, pediatric specialty suggestion.
- Live Care Guide: chest-pressure/breathlessness emergency response without booking; mild headache self-care; warfarin/ibuprofen caution; ASL draft without inventing deafness.
- Browser: sample intake, ranked results, simulated booking confirmation, correct Google Calendar link time, editable email subject reflected in mailto link, day theme, large text, reset, all six language switches, guide navigation.
- All five API endpoints reject JSON null with HTTP 400.

## Limits
These are sampled functional checks, not clinical validation. Medical correctness cannot be guaranteed by a prompt or disclaimer. Browser microphone capture, audible synthesis/barge-in, real PDF interpretation, authenticated Google Calendar writes and no-provider fallbacks were not revalidated in this pass. Calendar links were inspected; no real calendar event or clinic message was sent.

## Repeat
Run `npm run dev`, then `python scripts/check-local.py`. `python scripts/smoke-ai.py` runs live AI cases with fictional inputs and writes ignored local results; this incurs provider usage. Review response content as well as source fields. The script is a diagnostic runner, not a clinical test suite.

Guidance review sources: https://www.nhs.uk/symptoms/headaches/ and https://www.nhs.uk/symptoms/chest-pain/ (emergency symptom patterns; the app uses US emergency numbering).
