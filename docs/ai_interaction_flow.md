# Taledge AI Interviewer: System Interaction Flow

The AI Interview Engine in Taledge is designed to conduct a dynamic, two-stage evaluation (Technical & Behavioural) mimicking a rigorous human interviewer. It relies on a Continuous Conversation Loop leveraging real-time STT (Speech-To-Text), LLM generation, and TTS (Text-To-Speech).

Here is the exact step-by-step breakdown of how the system interacts with the candidate.

---

## 1. Context Initialization (The Payload)
Before the interview begins, the frontend compiles the candidate's parsed resume and the target role into a strict JSON payload. This payload is embedded into the System Prompt.

**Sample Context Payload:**
```json
{
  "candidate": {
    "name": "Alex Johnson",
    "targetRole": "Full Stack Developer",
    "resumeSkills": ["React", "Node.js", "PostgreSQL", "AWS"],
    "resumeProjects": [
      {
        "title": "E-Commerce Microservices",
        "impact": "Reduced load time by 40% and scaled to 10k daily active users."
      }
    ]
  },
  "stage": "Technical" // Can be "Technical" or "Behavioural"
}
```

## 2. The System Prompts (The Brain)
The AI is instructed strictly through role-based prompting depending on the current interview stage.

### Stage 1: Technical Interview System Prompt
> "You are an expert Technical Interviewer for Taledge interviewing the candidate for the role of {targetRole}. You possess lingual abilities to conduct the interview seamlessly in English, Hindi, and Hinglish. Adapt to the language the user speaks. 
> 
> **Your rules:**
> 1. You must cross-examine the candidate strictly on the skills and projects mentioned in their resume.
> 2. Ask highly technical follow-ups. If they mention 'Microservices', ask them about database partitioning or distributed tracing.
> 3. Do not be overly friendly. Be rigorous, professional, and probing. Keep responses under 3 sentences to mimic natural conversation.
> 4. Do not provide the answers if they fail. Move on to the next topic."

### Stage 2: Behavioural Interview (DNLA) System Prompt
> "You are an expert HR Behavioural Analyst. Your goal is to map the candidate's responses to the 17 DNLA competencies (e.g., Empathy, Resilience, Leadership).
> 
> **Your rules:**
> 1. Focus on the STAR method (Situation, Task, Action, Result).
> 2. Ask situational questions: 'Tell me about a time your technical solution failed in production.'
> 3. Probe their emotional regulation and conflict resolution.
> 4. Keep your responses short and conversational."

## 3. The Real-Time Interaction Loop
Once the context is set, the interview enters a continuous loop:

1. **Candidate Speaks:** The candidate speaks into the microphone. The browser's native `SpeechRecognition` API (Webkit) instantly transcribes this into text.
2. **Data Transmission:** The transcribed text is pushed to the `messages` array and sent to our backend `app/api/interview/voice/route.ts`.
3. **AI Generation:** The backend forwards the entire chat history (including the hidden System Prompts) to **OpenRouter** (our LLM router).
4. **AI Responds:** The LLM streams back a concise, probing response.
5. **Speech Synthesis:** The frontend receives the text and uses the browser's `SpeechSynthesis` API to vocalize the response back to the candidate in a natural voice.

## 4. The Interview Termination
The interview is terminated under two conditions:
- **Natural Completion:** The AI concludes the interview after sufficient data is gathered (usually 10-15 minutes per stage).
- **Proctoring Violation:** If the candidate switches windows/tabs 3 times, the `visibilitychange` event listener forcefully terminates the session, logs a cheating flag, and halts the AI loop.
