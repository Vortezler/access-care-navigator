// English — the source dictionary. Every other language is type-checked against this shape.

import type { AccessibilityKey, Specialty } from "../types";

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

export interface ScriptArgs {
  name: string;
  specialty: string;
  reason: string;
  insurance: string;
  memberId: string;
  needs: string[];
  days: number;
}

const en = {
  common: {
    close: "Close",
    newTab: "(opens in a new tab)",
    language: "Language",
  },
  header: {
    home: "AccessCare Navigator, home",
    readAloud: "Read aloud",
    stopReading: "Stop reading",
    display: "Display",
    startOver: "Start over",
    guide: "Care Guide",
    skip: "Skip to main content",
  },
  footer:
    "Demo build: clinics are fictional and booking is simulated. Your answers are used only to generate this session’s results and are never stored. Nothing on this site is medical advice. Talk to a doctor about your symptoms, and in an emergency call 911.",
  hero: {
    eyebrow: "No more calling around in the dark",
    titleBefore: "Find care that’s ",
    titleEm: "ready",
    titleAfter: " for you.",
    lede: "Tell us what you need once. We check every clinic’s accessibility for you, then book the visit or hand you a script that does the advocating.",
    guideCta: "Rather talk it through, or have a referral or medical documents? Ask the Care Guide",
  },
  specialties: {
    Neurology: "Neurology",
    Cardiology: "Cardiology",
    Dermatology: "Dermatology",
    Orthopedics: "Orthopedics",
    Psychiatry: "Psychiatry",
    "Primary Care": "Primary Care",
    "OB/GYN": "OB/GYN",
    Pediatrics: "Pediatrics",
    ENT: "ENT (ear, nose & throat)",
    "Physical Therapy": "Physical Therapy",
  } as Record<Specialty, string>,
  access: {
    labels: {
      wheelchairAccessibleExamRoom: "Wheelchair-accessible exam room",
      adjustableHeightExamTable: "Adjustable-height exam table",
      sensoryQuietWaitingRoom: "Sensory-friendly / quiet waiting room",
      aslInterpreterRequired: "ASL interpreter available",
      serviceAnimalFriendly: "Service-animal friendly",
    } as Record<AccessibilityKey, string>,
    short: {
      wheelchairAccessibleExamRoom: "Wheelchair-accessible exam room",
      adjustableHeightExamTable: "Adjustable-height exam table",
      sensoryQuietWaitingRoom: "Sensory-friendly / quiet waiting room",
      aslInterpreterRequired: "ASL interpreter",
      serviceAnimalFriendly: "Service-animal friendly",
    } as Record<AccessibilityKey, string>,
    desc: {
      wheelchairAccessibleExamRoom: "Room to turn and transfer, step-free entry",
      adjustableHeightExamTable: "Lowers for a safe transfer from a chair",
      sensoryQuietWaitingRoom: "Low light, low noise, a calm place to wait",
      aslInterpreterRequired: "Qualified in-person or video interpreter",
      serviceAnimalFriendly: "Your service animal is welcome in every room",
    } as Record<AccessibilityKey, string>,
  },
  form: {
    errorsHeading: (n: number) => `Please fix ${n} ${s(n, "thing", "things")} before we search`,
    serverErrorHeading: "We couldn’t search right now",
    networkError: "We couldn't reach the server. Please try again.",
    somethingWrong: "Something went wrong.",
    s1Title: "About you",
    s1Hint:
      "So the clinic knows who’s calling. This is a demo — use any details you like. Every box has a microphone button if you’d rather speak than type.",
    s2Title: "The care you need",
    s2Hint: "Tell us what’s going on. Pick a specialty yourself, or let us suggest one.",
    s3Title: "Accessibility needs",
    s3Hint: "Choose everything that matters to you. We check each one, clinic by clinic.",
    s4Title: "How should we help?",
    s4Hint: "You stay in control either way.",
    labels: {
      patientName: "Your name",
      insurancePayer: "Insurance",
      memberId: "Member ID",
      specialty: "Specialty",
      reasonForVisit: "What’s going on? (reason for visit)",
      urgencyWindowDays: "Need to be seen within (days)",
    },
    help: {
      insurancePayer: "The company name on your card.",
      memberId: "Only used inside your call script. Say “dash” for a hyphen.",
      reasonForVisit:
        "Your symptoms in your own words: what it feels like, where, for how long, and what makes it better or worse.",
      urgencyWindowDays: "We’ll highlight openings in this window. You can say “two weeks”.",
    },
    insurancePlaceholder: "e.g. Aetna, Medicaid",
    chooseOne: "Choose one…",
    errors: {
      patientName: "Enter your name.",
      insurancePayer: "Enter your insurance company, for example Aetna.",
      memberId: "Enter your member ID.",
      specialty: "Choose a specialty.",
      reasonForVisit: "Tell us briefly why you need this visit.",
      urgencyWindowDays: "Enter a whole number of days from 1 to 365.",
    },
    autoTitle: "Try to book for me",
    autoDesc: "Book online where a clinic allows it; script the rest.",
    callTitle: "Just prepare a call script",
    callDesc: "I’d rather make the call myself, with a script in hand.",
    submit: "Find accessible clinics",
    submitting: "Finding accessible clinics…",
    sample: "Use a sample patient",
    sampleFilled: "Sample patient filled in. Review and submit when ready.",
    found: (n: number) => `Found ${n} ${s(n, "clinic", "clinics")}. Opening results.`,
    selected: (sp: string) => `${sp} selected.`,
    mic: {
      patientName: "your name",
      insurancePayer: "your insurance company",
      memberId: "your member ID",
      reasonForVisit: "your reason for visit",
      specialty: "a specialty",
      urgencyWindowDays: "how many days",
    },
    voiceNoSpecialty: (t: string) => `Didn't recognise “${t}” as a specialty. Try saying, for example, “neurology”.`,
    voiceNoNumber: (t: string) => `Didn't catch a number in “${t}”. Try “14” or “two weeks”.`,
  },
  suggest: {
    button: "Suggest the right specialist",
    again: "Suggest again",
    thinking: "Thinking it through…",
    status: "Thinking about which specialist fits…",
    note: "An AI suggestion, not medical advice. A general physician can confirm the right specialist.",
    needText: "Describe what’s going on first. A sentence or two is plenty.",
    failed: "Couldn't get a suggestion.",
    suggested: "Suggested:",
    confidence: { high: "Strong match", medium: "Likely match", low: "Best guess" },
    emergencyTitle: "This may need emergency care",
    emergencyDefault:
      "Some of what you describe can be a sign of an emergency. Call 911 or go to the nearest emergency room now.",
    dontWait: "Don’t wait for an appointment.",
    urgentDefault: "Try to be seen within a day or two.",
    narrowed: "We’ve narrowed your time window to match.",
    selectedNote: (sp: string) => `${sp} is now selected below. You can change it at any time.`,
    otherChosen: (sp: string) => `You’ve chosen ${sp} instead. That’s fine — it’s your call.`,
    stale: "You’ve changed your description since this suggestion. Choose “Suggest again” to update it.",
    choose: (sp: string) => `Choose ${sp}`,
    primaryReason: "See a general physician first. They can confirm what you need and refer you.",
    goBack: (sp: string) => `Go back to ${sp}`,
    disclaimerStrong: "This isn’t a diagnosis or medical advice.",
    disclaimerBody:
      "It’s an AI suggestion to help you find the right kind of clinic, and it can be wrong. It’s best to check with a general physician or your own doctor before booking a specialist. They can confirm what you need, and some insurance plans require their referral. If you think it’s an emergency, call 911.",
    source: {
      bedrock: "Suggested by Claude via AWS Bedrock",
      anthropic: "Suggested by Claude",
      template: "AI unavailable: defaulting to a general physician",
    },
  },
  results: {
    checked: (n: number) => `${n} ${s(n, "clinic", "clinics")} checked`,
    title: (sp: string) => `Your ${sp} matches`,
    insurance: (p: string) => `Insurance: ${p}`,
    needs: (n: number) => `${n} accessibility ${s(n, "need", "needs")}`,
    within: (d: number) => `Within ${d} days`,
    edit: "Edit search",
    emptyTitle: "Nothing here yet",
    emptyBody: "Your results live only in this browser tab. Start a search to see matched clinics.",
    start: "Start a search",
    noneTitle: (sp: string) => `No ${sp} clinics in our demo dataset`,
    noneBody: "Try another specialty.",
    listLabel: "Matched clinics, best first",
  },
  card: {
    best: "Best match",
    rank: (n: number) => `#${n}`,
    scoreAria: (n: number) => `Match score ${n} out of 100`,
    match: "match",
    inNetwork: "In-network",
    outNetwork: "Out-of-network — verify",
    online: "Online booking",
    phoneOnly: "Phone booking only",
    openings: (n: number, d: number) => `${n} ${s(n, "opening", "openings")} in ${d} days`,
    noOpenings: (d: number) => `No openings in ${d} days`,
    needsMet: (m: number, t: number) => `Your needs · ${m} of ${t} met`,
    noNeeds: "You didn’t select specific needs.",
    yes: "Yes",
    no: "No",
    alsoOffers: (list: string) => `Also offers: ${list}.`,
    why: "Why this clinic",
    accessCheck: "Accessibility check",
    source: { bedrock: "AI summary · Claude on AWS Bedrock", anthropic: "AI summary · Claude", template: "Summary" },
    book: "Book a slot",
    script: "Get call script",
    bookInstead: "Book online instead",
  },
  booking: {
    title: (c: string) => `Book at ${c}`,
    booked: "You’re booked",
    subtitle: "Pick an opening. We’ll pass your accessibility needs along with the booking.",
    demoNote: "Demo booking — no real appointment is made and no clinic is contacted.",
    demoDone: "Demo booking — no real appointment was made.",
    available: "Available appointments",
    within: (d: number) => `Within your ${d}-day window`,
    later: (d: number) => `Later than your ${d}-day window`,
    clash: "Clashes with something on your calendar",
    free: "You’re free then",
    checking: "Checking your Google Calendar for clashes…",
    confirm: "Confirm booking",
    cancel: "Cancel",
    done: "Done",
    confAria: (c: string) => `Confirmation number ${c.split("").join(" ")}`,
  },
  script: {
    title: (c: string) => `Your call script for ${c}`,
    subtitle: "Read it as-is or make it yours. Call",
    writing: "Writing your call script…",
    ready: "Your call script is ready.",
    copiedStatus: "Script copied to clipboard.",
    errorTitle: "We couldn’t write the script",
    failed: "Couldn't generate a script.",
    tryAgain: "Try again",
    label: "Your call script",
    source: {
      bedrock: "Written by Claude via AWS Bedrock",
      anthropic: "Written by Claude via the Anthropic API",
      template: "Built from our standard script (AI unavailable)",
    },
    copy: "Copy script",
    copied: "Copied",
    listen: "Listen to script",
    stopListen: "Stop listening",
    readingLabel: "Reading your script",
    remind: "Remind me to call",
    reminderAt: (when: string) => `The reminder is for ${when}, when most front desks are open.`,
  },
  cal: {
    nouns: { appointment: "appointment", reminder: "reminder", event: "event" },
    add: (noun: string) => `Add ${noun} to Google Calendar`,
    connectAdd: (noun: string) => `Connect Google & add ${noun}`,
    adding: "Adding…",
    added: "Added. Open in Google Calendar",
    addedStatus: (noun: string) => `The ${noun} was added to your Google Calendar.`,
    error: (m: string) => `Couldn’t add to Google Calendar: ${m}`,
    download: "Download .ics",
  },
  events: {
    apptTitle: (sp: string, clinic: string) => `${sp} appointment at ${clinic}`,
    confirmation: (c: string) => `Confirmation: ${c} (demo booking)`,
    phone: (p: string) => `Clinic phone: ${p}`,
    reason: (r: string) => `Reason: ${r}`,
    accommodations: (list: string) => `Accommodations requested: ${list}`,
    callTitle: (c: string) => `Call ${c} to book`,
    callDesc: (c: string, p: string) => `Call ${c} at ${p}. Have your advocacy script and insurance card ready.`,
  },
  panel: {
    title: "Display & reading",
    subtitle: "Saved in this browser only. Changes apply right away.",
    language: "Language",
    languageBody: "The whole site, the AI’s answers, voice typing and read-aloud switch to this language.",
    readTitle: "Read aloud",
    readBody: "Hear the page spoken, with each part highlighted as it’s read.",
    readButton: "Read this page aloud",
    speed: "Reading speed",
    slow: "Slow",
    normal: "Normal",
    fast: "Fast",
    voice: "Voice",
    defaultVoice: "Default voice",
    noSpeech: "This browser doesn’t support speech. Your screen reader works with every part of this site.",
    colors: "Colors",
    theme: "Color theme",
    night: "Night",
    nightDesc: "Dark and calm. The default.",
    day: "Day",
    dayDesc: "Light background, dark text.",
    contrast: "High contrast",
    contrastDesc: "Black, white and yellow. No transparency.",
    text: "Text",
    textSize: "Text size",
    sizes: ["Default text size", "Large text", "Larger text", "Largest text"],
    fontTitle: "Easier-to-read font",
    fontDesc: "Atkinson Hyperlegible, with wider letter, word and line spacing",
    motionTitle: "Reduce motion",
    motionDesc: "Gentle fades instead of sliding and zooming",
    calTitle: "Google Calendar",
    connectedAs: (email?: string) => (email ? `Connected as ${email}` : "Connected"),
    connectedBody:
      "Bookings and call reminders go straight onto your calendar, and openings that clash with your schedule are flagged. The connection is stored only in this browser.",
    disconnect: "Disconnect and forget",
    notConnected: "Not connected",
    notConnectedBody:
      "Connect to add appointments in one click and see which openings clash with your schedule. There’s no account here: the connection is saved only in this browser, and you can disconnect at any time.",
    connect: "Connect Google Calendar",
    waiting: "Waiting for Google…",
    noSetupBody:
      "“Add to Google Calendar” buttons open Google Calendar with the event already filled in, so there’s nothing to set up. You can also download an .ics file for any calendar app.",
    reset: "Reset display settings",
    done: "Done",
  },
  reader: {
    page: "Reading this page",
    dialog: "Reading this dialog",
    paused: "Paused",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",
    controls: "Read aloud controls",
    selected: "Selected",
    notSelected: "Not selected",
    empty: "empty",
    nothing: "nothing chosen",
  },
  voice: {
    speak: (f: string) => `Speak ${f}`,
    stop: (f: string) => `Stop voice typing for ${f}`,
    title: "Voice typing",
    stopTitle: "Stop voice typing",
    listening: (f: string) => `Listening for ${f}. Speak now.`,
    got: (t: string) => `Got it: ${t}`,
    errors: {
      blocked: "Microphone access is blocked. Allow it in your browser's site settings, then try again.",
      noSpeech: "We didn't hear anything. Try again and speak after the tone.",
      noMic: "No microphone was found.",
      network: "Voice typing needs an internet connection in this browser.",
      generic: "Voice typing stopped unexpectedly. Please try again.",
    },
  },
  guide: {
    title: "Care Guide",
    subtitle:
      "Talk or type. Share a referral or medical document (PDF), and the guide will work out what care you need, find an accessible clinic, book it and put it on your calendar.",
    disclaimer:
      "The Care Guide is an AI assistant, not a doctor. It can’t diagnose, and it can make mistakes. Check with a general physician before booking a specialist. In an emergency, call 911.",
    welcome:
      "Hi, I’m the Care Guide. Tell me what’s going on, or upload a referral or medical document, and I’ll help you find an accessible clinic, book it and add it to your calendar. What can I help with?",
    starters: [
      "I have a referral letter. Can you read it and find me a clinic?",
      "I need a neurologist with an ASL interpreter who takes Aetna.",
      "I’m not sure what kind of doctor to see for my back pain.",
    ],
    logLabel: "Conversation with the Care Guide",
    you: "You",
    guide: "Care Guide",
    inputLabel: "Message the Care Guide",
    placeholder: "Type a message, or press the microphone…",
    send: "Send",
    attach: "Attach PDF",
    attachHint: "PDF only · up to 10 MB each · 3 per message",
    remove: (name: string) => `Remove ${name}`,
    notPdf: (name: string) => `${name} isn’t a PDF.`,
    tooBig: (name: string) => `${name} is larger than 10 MB.`,
    tooMany: "You can attach up to 3 PDFs per message.",
    attached: (n: number) => `${n} PDF${n === 1 ? "" : "s"} attached`,
    thinking: "The Care Guide is thinking…",
    error: "Something went wrong reaching the Care Guide. Please try again.",
    newChat: "New conversation",
    voiceStart: "Start voice conversation",
    voiceEnd: "End voice conversation",
    voiceListening: "Listening… speak now",
    voiceThinking: "Thinking…",
    voiceSpeaking: "Speaking…",
    voicePaused: "Didn’t hear anything. Press the microphone to try again.",
    voiceUnsupported: "Voice conversation needs Chrome, Edge or Safari. You can still type.",
    stopSpeaking: "Stop speaking",
    autoRead: "Read replies aloud",
    unavailable: "AI unavailable",
    clinicsFound: (n: number) => `${n} ${s(n, "clinic", "clinics")} found`,
    needsMet: (m: number, t: number) => `${m}/${t} needs met`,
    booked: "Booked (demo)",
    calendarCard: "Calendar event",
    scriptCard: (c: string) => `Call script for ${c}`,
  },
  // Text the server uses when no AI is available (and to tell the AI which language to write in)
  tpl: {
    languageName: "English",
    noNeeds: "You didn't select any accessibility requirements.",
    meets: (m: number, t: number, missing: string) =>
      `Meets ${m} of ${t} of your accessibility requirements${missing ? ` (missing: ${missing})` : ""}.`,
    inNetwork: "In-network with your insurance.",
    outNetwork: "May be out-of-network — verify before booking.",
    openings: (n: number, d: number) => `${n} ${s(n, "opening", "openings")} within your ${d}-day window.`,
    noOpenings: (d: number) => `No listed openings within your ${d}-day window.`,
    script: (a: ScriptArgs) => `Hi, my name is ${a.name}. I'm calling to schedule a new-patient ${a.specialty.toLowerCase()} appointment.

The reason for my visit: ${a.reason}

My insurance is ${a.insurance}, member ID ${a.memberId}. Could you confirm you're in-network with that plan?

I have a disability, and I want to make sure the visit will be accessible before I book. Before we pick a time:
${
  a.needs.length
    ? a.needs.map((n) => `  • Can you confirm you have: ${n.toLowerCase()}?`).join("\n")
    : "  • I don't have specific accessibility requests, but I'd like to know what accommodations you offer."
}

If any of these aren't available, could you tell me what you can arrange instead, or note the request in my chart so it's ready when I arrive?

I'm hoping to be seen within the next ${a.days} days. What's the earliest appointment you have?

Before we hang up, could you please repeat back the date, time, and the accommodations you've noted, and give me a confirmation number?

Thank you so much for your help.`,
    triageReasoning:
      "Our AI helper isn't available right now, so we can't read your description closely enough to point you to a specialist. A general physician is the right first stop: they can assess everything together and refer you on if needed.",
    triageEmergency:
      "Some of what you wrote can be a sign of an emergency. Call 911 or go to the nearest emergency room now.",
    chatUnavailable:
      "I can't think right now — the AI service isn't connected on this server, so I can't read documents or chat. You can still find and book accessible clinics with the form on the home page, and every result has a call script and calendar buttons.",
  },
};

export type Dict = typeof en;
export default en;
