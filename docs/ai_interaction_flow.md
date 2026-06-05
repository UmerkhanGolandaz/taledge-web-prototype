---
title: "Taledge AI Interaction Pipeline: Core Technical Architecture"
author: "Taledge Systems Engineering"
date: "June 2026"
---

<style>
  body { font-family: 'Inter', -apple-system, sans-serif; color: #0f172a; line-height: 1.6; max-width: 900px; margin: 0 auto; background-color: #fafafa; }
  h1 { color: #1e1b4b; border-bottom: 3px solid #6366f1; padding-bottom: 15px; font-size: 2.2rem; text-align: center; }
  h2 { color: #4338ca; border-bottom: 1px solid #e0e7ff; padding-bottom: 5px; margin-top: 40px; }
  h3 { color: #3730a3; margin-top: 25px; }
  pre { background-color: #1e293b; color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 0.85rem; overflow-x: auto; border: 1px solid #334155; }
  code { font-family: 'Fira Code', monospace; color: #c7d2fe; }
  p { color: #334155; font-size: 1.05rem; }
  .highlight { background-color: #e0e7ff; border-left: 4px solid #4f46e5; padding: 15px; border-radius: 4px; margin: 20px 0; }
  .page-break { page-break-before: always; }
</style>

# Taledge Enterprise AI Interview Pipeline

<div class="highlight">
<strong>Architectural Overview</strong><br>
This document details the exact sequence diagrams, payload schemas, and sub-system architectures that power the Taledge Dual-Track AI Interview Engine. The system leverages an asynchronous, bi-directional streaming architecture with real-time semantic processing, advanced adversarial LLM routing, and heuristic proctoring matrices.
</div>

## 1. System Initialization & State Hydration
Before the WebRTC or WebSocket layers establish a connection, the `EngineController` hydrates a strict execution context. This prevents hallucination and binds the LLM to a deterministic evaluation path.

### 1.1 The Multi-Dimensional Context Payload
The frontend compiles an aggregated, token-optimized JSON structure containing parsed ATS data, Job Description (JD) Vector Embeddings, and Academic historical markers.

```json
{
  "session_id": "vtx_99812a_b7",
  "execution_mode": "adversarial_tech",
  "candidate_matrix": {
    "identity_hash": "2f4b9d0a",
    "target_role": "Senior Cloud Solutions Architect",
    "skill_graph_embeddings": [0.012, -0.045, 0.992, ...],
    "verified_tech_stack": {
      "primary": ["Kubernetes", "AWS EKS", "Go"],
      "secondary": ["PostgreSQL", "Terraform"]
    },
    "impact_claims": [
      {
        "domain": "Distributed Systems",
        "claim": "Engineered a zero-downtime deployment pipeline scaling to 50k RPS.",
        "validation_flag": "REQUIRES_DEEP_PROBING"
      }
    ]
  },
  "constraints": {
    "max_turn_latency_ms": 1200,
    "cognitive_load_multiplier": 1.5
  }
}
```

## 2. The Deterministic LLM Persona Routing
The "Brain" of the system relies on dynamic system-prompt injection. Depending on the `execution_mode`, the context is routed to specialized sub-models.

### 2.1 The Elite Technical Adversary (Stage 1)
Instead of a generic system prompt, the LLM is bound by a strict adversarial framework designed to induce and measure cognitive load.

```text
SYSTEM PROMPT BINDING:
[Role]: Elite Principal Engineer & Hostile System Architect.
[Language Parameters]: Multilingual continuous (English/Hindi/Hinglish) with auto-detection.
[Execution Directives]:
1. TARGET CLAIMS: Isolate the candidate's claim: "zero-downtime deployment pipeline scaling to 50k RPS."
2. STRESS VECTOR: Ask them how their architecture handles a split-brain network partition in the Redis caching layer during a deploy.
3. COGNITIVE LOAD: If they answer correctly, immediately compound the load by introducing a sudden IOPS bottleneck on the primary PostgreSQL shard. 
4. OUTPUT FORMAT: Maximum 45 words. High density. No pleasantries. Probe edge cases strictly. Do not validate their answers.
```

### 2.2 The Psychometric DNLA Analyst (Stage 2)
```text
SYSTEM PROMPT BINDING:
[Role]: Clinical Behavioural Psychologist & HR Director.
[Execution Directives]:
1. BEHAVIOURAL TRAPPING: Bypass standard STAR methodology. Induce cognitive dissonance by asking them to defend a time they knowingly bypassed protocol to meet a deadline.
2. LINGUISTIC MAPPING: Track Pronoun Indexing (I vs We). If 'We' is used for success and 'They' for failure, trigger the [Accountability Deficit] flag.
3. EMOTIONAL REGULATION: Apply mild conversational pressure to measure baseline defensive mechanism triggers.
```

<div class="page-break"></div>

## 3. The Bi-Directional Streaming Pipeline
The conversational loop is not a standard HTTP Request/Response model. It uses an ultra-low latency continuous stream.

### 3.1 Step-by-Step Subsystem Execution
1. **Auditory Ingestion (STT Array):** The candidate speaks. The browser captures audio chunks via the MediaRecorder API, feeding it into a VAD (Voice Activity Detection) buffer. Once a pause of `700ms` is detected, the transcribing Webkit API fires the finalized payload.
2. **Pre-Processing & Sanitization:** The raw text is passed through a semantic normalizer to strip filler words ("um", "uh") and extract core intent, reducing token bloat before LLM transmission.
3. **LLM Inference Generation:** The backend streams the normalized history to the LLM router (OpenRouter fallback cluster). The generation is parameterized with `temperature: 0.6` and `top_p: 0.8` to ensure high determinism and low hallucination.
4. **Chunked TTS Streaming:** To eliminate waiting latency, the LLM's response is chunked by sentence delimiters (`.`, `?`). As soon as the first sentence is generated, it is pushed to the client via Server-Sent Events (SSE) and immediately vocalized by the `SpeechSynthesis` Web API while the LLM continues generating the rest in the background.

## 4. Multi-Vector Security & Proctoring Environment
To guarantee assessment integrity, the interview environment runs inside a heavily sandboxed, heuristic monitoring wrapper.

### 4.1 Environmental Heuristics
- **Context-Switch Deterrence:** A strict `visibilitychange` listener is bound to the document root. If `document.hidden` returns `true`, a Level 1 Violation is recorded. At 3 violations, the WebSocket is forcefully severed, and the session is burned.
- **Micro-Expression Latency Tracking:** The system calculates the exact millisecond delta between the AI finishing its speech and the candidate beginning theirs. A latency > 4000ms triggers a `HIGH_HESITATION` flag, heavily weighting the confidence score downwards.
- **Copy-Paste Nullification:** All standard clipboard events (`keydown` for `Meta+C/V`, `contextmenu`) are intercepted and `preventDefault()` is called. 

## 5. Session Termination & State Output
Upon termination (either via natural token limit exhaustion or a security breach), the `EngineController` compiles the entire transcript, the latency metadata, and the proctoring logs into a finalized `AssessmentLedger`. This ledger is then placed into a high-throughput queue (e.g., Redis/Kafka) where the asynchronous Scoring Engine (`/api/generate-fit-score`) takes over to calculate the final Fit Score.
