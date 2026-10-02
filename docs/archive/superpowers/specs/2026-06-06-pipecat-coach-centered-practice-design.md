# Pipecat Coach-Centered Practice Experience Design

## Purpose

The current Pipecat integration proves the realtime voice pipeline can work, but the practice room still feels too close to a technical demo. This design keeps the required architecture intact while improving the learner-facing experience: the original animated coach becomes the center of the practice room, the UI explains voice state in human language, and the app gives recoverable guidance when microphone, playback, or Pipecat connection issues happen.

## Scope

This design covers the 5-7 minute realtime speaking practice experience only:

- Practice room layout and state feedback.
- Start, end, and report-generation flow.
- Lightweight preflight and recoverable error states.
- Realtime conversation log behavior.
- Boundaries between the React app, Node business backend, and Python Pipecat Voice Agent.

It does not cover account systems, historical report pages, scenario authoring beyond the existing flow, or redesigning the final report content model.

## Non-Negotiables

- Keep the existing original `MascotAvatar` / `CoachAvatar` character. Do not redraw, abstract, replace, or restyle the coach identity into a new character.
- Use the coach as the practice-room state center, not a small corner decoration.
- Keep the three core learner actions: start training, end training, generate report.
- Do not reintroduce fixed-round submission, editable transcript boxes, mock transcript buttons, confidence panels, debug audio players, or visible VAD/STT/LLM/TTS plumbing.
- Pipecat remains the realtime voice agent layer only. Node remains responsible for `practice_session`, `conversation_turns`, and report generation.

## Recommended Direction

Use the combined B + A approach:

1. Demo reliability first: make the start flow resilient and explain failures clearly.
2. Coach-centered experience second: make the original animated coach visibly represent whether the system is listening, thinking, speaking, or reviewing.

This combination serves a live competition demo better than a pure visual refresh because it reduces the chance of voice failure while making the successful path feel like real coaching rather than realtime transcription.

## Practice Room Layout

The left/main panel should be the coach stage. It contains:

- The original animated coach at a prominent size.
- The current AI prompt or follow-up.
- A human-readable state line.
- A subtle listening/speaking visual treatment around the coach or beneath the prompt.
- The three core buttons.
- A short helper line such as "Pause briefly when you finish; I will respond automatically."

The right panel remains the realtime conversation log. It shows complete AI and learner turns only, not streaming token fragments. The log should use friendly labels (`AI`, `You`) and preserve the latest turns in view.

On smaller screens, the coach stage comes first and the conversation log follows below. The coach should remain visible above the fold where feasible.

## State Model

Map technical events into learner language:

- `idle`: "Ready when you are"
- `connecting`: "Checking microphone and voice connection"
- `listening`: "I'm listening"
- `thinking`: "Thinking about your answer"
- `speaking`: "I'm replying"
- `ended`: "Practice ended. Ready for your report"
- `completed`: "Report ready"

The coach visual state should follow the same state model:

- `idle`: calm ready posture.
- `listening`: attentive state.
- `thinking`: analyzing state.
- `asking` or speaking equivalent: AI response state.
- `reviewing`: report-generation state.
- `celebrating`: completion state.

No visible copy should say "Pipecat Voice Agent has taken over VAD / STT / LLM / TTS" in the learner-facing practice room. That information can remain in README or developer docs.

## Start Flow And Preflight

Clicking "Start Training" should:

1. Create a `practice_session` in Node.
2. Check Pipecat `/health` before opening WebRTC.
3. Request microphone access through the Pipecat client flow.
4. Connect to `/api/offer`.
5. Attach the remote audio track to the hidden playback element.
6. Transition to `listening` once connected and ready.

The UI should keep this as a single user action. Preflight status can appear as a compact helper line inside the coach stage. It should not add a fourth primary button.

## Recoverable Error Handling

Errors should be specific and actionable:

- Pipecat service unavailable: "Voice service is not running. Start the Python service on 127.0.0.1:7860, then try again."
- Microphone denied: "Microphone permission is blocked. Allow microphone access in the browser, then start again."
- Browser autoplay blocked: "The browser blocked AI audio playback. Click Start Training again or check the speaker permission."
- Remote audio track missing after connection: "Voice connected, but AI audio is not playing yet. Check output device or restart training."
- API key/provider issue: "Voice provider is not ready. Open API settings or switch to mock mode for demo."

The error should appear in the coach stage, with the original coach still present. Do not replace the coach with a technical error panel.

## Conversation Turns

Every complete AI and user utterance should be written to `conversation_turns`.

- User turns come from final transcript events.
- AI turns come from complete LLM response/server message events, not token-level TTS text.
- The frontend should normalize whitespace and dedupe identical turns from multiple event sources.
- The right-side log should display only complete turns.

The opening AI question created by Node remains useful as the initial session anchor. If Pipecat also speaks the same question, duplicate display should be avoided.

## End And Report Flow

The training ends when:

- The selected duration expires, or
- The user clicks "End Training".

Ending should disconnect Pipecat, stop the countdown, mark the session ended in Node, and switch the coach to reviewing mode. The "Generate Report" button then becomes available. Its helper line should say something like "Your full conversation is ready for review."

Report generation continues to read the authoritative `conversation_turns` from Node and produce the seven required dimensions:

- fluency
- pronunciation
- grammar
- vocabulary
- coherence
- task_completion
- interaction

## Implementation Boundaries

React frontend:

- Owns learner-facing state, coach stage layout, audio track attachment, and error copy.
- Calls Node for sessions/reports and Pipecat for realtime WebRTC.
- Does not perform VAD, STT, LLM tutoring, or TTS itself.

Node backend:

- Owns `practice_session`, `conversation_turns`, and report generation.
- Provides start/end/add-turn/read-session/report APIs.

Pipecat service:

- Owns realtime pipeline: Audio Input -> VAD -> STT -> LLM Tutor Agent -> TTS -> Audio Output.
- Publishes complete AI turn messages and relies on final transcript events for user turns.
- Does not own business history, reports, user accounts, or UI state.

## Testing And Verification

Required checks before calling the implementation complete:

- `npm run typecheck`
- `npm test`
- Python compile check for `pipecat_service/server.py` and `pipecat_service/bot.py`
- Health checks for frontend, Node API, and Pipecat service
- Browser verification of the practice room in desktop and narrow viewport
- Manual realtime smoke test:
  - Start training.
  - Confirm the original coach remains visible and prominent.
  - Confirm state changes through connecting, listening, speaking, and ended.
  - Speak one answer.
  - Confirm a complete user turn and a complete AI turn appear in the log.
  - Confirm AI audio plays.
  - End training and generate a report.

## Open Decisions

No unresolved product decisions remain for the first implementation slice. The selected direction is: keep the original coach as the central practice-room state indicator, combine lightweight reliability checks with friendlier voice-state copy, and preserve the three-button interaction model.
