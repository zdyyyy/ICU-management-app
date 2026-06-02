# ICU Resource Manager

A hospital ICU resource and patient-flow management application, built with an Ottawa hospital context in mind. It helps staff track beds, manage patients, prioritize the waitlist, and get AI-assisted operational guidance grounded in WHO clinical guidelines.

## What it does

Hospital teams need a single view of bed availability, who is waiting, and who should be seen next. This app provides that dashboard plus APIs for patient status lookup and an assistant that combines live operational data with retrieved guideline evidence.

### Bed management

Track beds across four types: **ICU**, **STEP_DOWN**, **GENERAL**, and **EMERGENCY**. Each bed can be available or occupied. Staff can assign patients to beds, release beds when patients are discharged, and query available capacity by type.

### Patient & waitlist management

Register and update patients, add them to a waitlist, and remove them when they are assigned or no longer waiting. The UI shows patients, ranked waitlist entries, and bed occupancy in one place.

### Priority-based triage

The waitlist is ranked using a triage score that combines:

- **Clinical priority** (Critical, High, Medium, Low)
- **Waiting time** — longer waits receive a modest boost so nobody is starved indefinitely

This helps answer “who should get the next bed?” in a consistent, explainable way.

### Patient portal

Patients (or staff on their behalf) can look up status by **MRN** (medical record number). The portal returns:

- Current status (waiting, assigned, etc.)
- Queue position and estimated wait category
- Assigned bed details when applicable

Responses are rate-limited and cached briefly to reduce load.

### AI assistant (RAG)

An integrated assistant acts as a clinical **operations** helper for the head nurse. When you ask a question, it receives:

1. **Live ICU data** — available beds and the top-ranked waitlist patients
2. **Guideline evidence** — relevant passages retrieved from a pre-built index of WHO PDFs (tuberculosis, dengue, HIV, meningitis, and others)

Answers are generated with OpenAI and cite guideline sources as `[G1]`, `[G2]`, etc. The assistant is designed to stay grounded in the provided data and not invent patients or beds.

## Architecture

| Layer | Stack |
|-------|--------|
| Backend | Node.js 18+, Express |
| Frontend | React 19, Vite |
| Data | In-memory store (demo/prototype; no persistent database) |
| AI | OpenAI (`gpt-4o-mini` for chat, `text-embedding-3-small` for RAG retrieval) |
| Deployment | Docker, Kubernetes manifests under `k8s/` |

The Express server exposes REST APIs under `/api/*`. In production, it can serve the built React app from `client/dist`. During development, run the Vite dev server separately; it proxies `/api` to the backend.

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm
- An OpenAI API key (required only for the Assistant feature)

### Install and run

```bash
# Backend
npm install
cp .env.example .env   # then set OPENAI_API_KEY

npm run dev            # API at http://localhost:3000

# Frontend (separate terminal)
npm run client:install
npm run client:dev     # UI at http://localhost:5173
```

To serve the UI from the same port as the API:

```bash
npm run client:build
npm start              # http://localhost:3000
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI key for the Assistant and query embeddings |
| `GUIDELINE_EMBEDDING_MODEL` | Embedding model (default: `text-embedding-3-small`) |
| `PORT` | Server port (default: `3000`) |
| `NODE_ENV` | `development` or `production` |

After changing `.env`, restart the backend — the server reads env vars only at startup.

## API overview

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Health check |
| `GET/POST /api/beds` | List, create, assign, and release beds |
| `GET/POST/PATCH /api/patients` | Patient CRUD |
| `GET/POST /api/waitlist` | Waitlist and ranked queue |
| `GET /api/triage/*` | Priority levels and waitlist ranking |
| `GET /api/patient-portal/status?mrn=...` | Patient status lookup |
| `POST /api/assistant/ask` | Ask the AI assistant |

## Guideline RAG pipeline

WHO guideline PDFs live under `data/guidelines/`. The repo includes pre-built chunk and embedding files for offline retrieval. To rebuild the index locally:

```bash
npm run extract:guideline-metadata
npm run promote:guideline-metadata
npm run build:guideline-index-input
npm run build:guideline-chunks
npm run embed:guideline-chunks   # requires OPENAI_API_KEY
```

Retrieval uses cosine similarity over embedded chunks in `data/guidelines/chunks.embedded.jsonl`.

## Docker & Kubernetes

```bash
npm run docker:build
npm run k8s:apply
```

Before applying to a cluster, build and load (or push) the image and create the `icu-openai` secret with your `OPENAI_API_KEY`. See comments in `k8s/deployment.yaml` for details.

## Project status

The project is under active development. Core workflows are in place, and features continue to be refined and expanded.

## License

MIT
