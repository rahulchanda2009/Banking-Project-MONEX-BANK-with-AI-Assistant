# Banking-Project-MONEX-BANK-with-AI-Assistant

A lightweight, containerised internet banking application running on Minikube, with an AI Assistant layer monitored and protected by **Splunk Agent Observability (Galileo)**.

**MONEX BANK LOGIN**
<img width="684" height="430" alt="monex1" src="https://github.com/user-attachments/assets/012a635e-f95d-4b4d-88d9-e7790dd5ee28" />

**AI ASSISTANT**
<img width="1010" height="747" alt="monex2" src="https://github.com/user-attachments/assets/31f4c31f-d0d8-48f5-84db-0c864f66dcaf" />


---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Components](#components)
3. [Pre-Reqs](#pre-reqs)
4. [Project Structure](#project-structure)
5. [How to Run the Banking App](#how-to-run-the-banking-app)
6. [How to Run the AI Service](#how-to-run-the-ai-service)
7. [Galileo / Agent Control Setup](#galileo--agent-control-setup)
8. [Validation Checks](#validation-checks)
9. [Demo Use Cases](#demo-use-cases)
10. [Troubleshooting](#troubleshooting)
11. [Steps Taken During the Build](#steps-taken-during-the-build)
12. [Known Limitations](#known-limitations)

---

## Architecture Overview

<img width="1478" height="727" alt="monex3" src="https://github.com/user-attachments/assets/2b02c44e-bf7b-46c6-8b04-5c0e95d40514" />


The solution has two layers:

| Layer | Runs on | Components |
|---|---|---|
| **Banking platform** | Minikube (namespace `banking`) | React + Nginx frontend, Spring Boot backend, PostgreSQL |
| **AI layer** | Developer host (Python venv) | FastAPI AI Assistant, LLM (LM Studio or OpenAI), knowledge base (RAG), banking tools |
| **Observability & guardrails** | SaaS | Splunk Agent Observability (Galileo): traces, metrics, Agent Control |

**Request flow**

1. The customer opens the Monex web app.
2. The web app calls the banking APIs (`/api/*` → `backend-service:8080`).
3. The backend reads and writes PostgreSQL.
4. The customer asks a question in the chat widget (`/ai/*` → `host.minikube.internal:3001`).
5. The LLM understands the question and picks a tool.
6. The AI Assistant searches the knowledge base (RAG) or runs a banking tool.
7. Tools fetch live customer data from the banking APIs (through `kubectl port-forward` on port 8080).
8. Agent Control checks the draft reply. On a hallucination or PII leak, it steers the LLM to retry.
9. Galileo traces every step and scores response quality.

**Why the AI service runs on the host, not in Minikube:** 
Cisco Secure Access re-signs TLS certificates. Containers don't trust the Cisco root CA, which caused `CERTIFICATE_VERIFY_FAILED` when calling OpenAI/Galileo from a pod. On the host, Python uses a trusted CA bundle.

---

## Components

### Banking platform

| Component | Tech | Notes |
|---|---|---|
| Frontend | React 18 + Nginx | Banking UI and chat widget (`ChatBot.js`). Nginx proxies `/api/` and `/ai/` |
| Backend | Java 17, Spring Boot | `/api/login`, `/api/account/{id}`, `/api/beneficiaries`, `/api/loans/{id}`, `/api/transfer`, `/api/loan/pay`, `/api/account/{id}/credit-card.png` |
| Database | PostgreSQL | `init.sql` creates `users`, `loans`, `beneficiaries`, `transactions`, `bill_payments`. Seeds 10 users (password = username) |

### AI layer

| Component | Tech | Notes |
|---|---|---|
| AI Assistant | Python 3.12, FastAPI, uvicorn (port 3001) | `ai-service/server.py` |
| LLM | LM Studio (Llama 3.1 8B, port 1234) or OpenAI `gpt-4o-mini` | Switch with `LLM_PROVIDER` |
| Knowledge base (RAG) | `ai-service/knowledge/monex_kb.md` | One chunk per `## ` section. Keyword search (embeddings optional) |
| Banking tools | Python functions | `get_balance`, `get_loans`, `get_beneficiary_count`, `get_card_info` (masked), `get_contact_details`, `get_identity_details` (PII), `check_upgrade_eligibility`, `search_knowledge_base` |
| Synthetic PII | `CUSTOMER_PROFILES` in `server.py` | Demo-only Aadhaar, PAN, email and phone for users 1–10. **Not real data** |
| Hallucination test mode | 🧪 toggle in the chat header | Shown only when `DEMO_MODE=true`. Deliberately produces wrong answers |

### Observability & guardrails

| Feature | Purpose |
|---|---|
| Galileo traces | LLM, tool and retriever spans for every chat request |
| Trace metrics | Context Adherence, Completeness, Tool Selection Quality, etc. |
| Agent Control | Runtime guardrails (`Financial-hallucination`, `PII-output-guard`) evaluated before the reply reaches the customer |

---

## Pre-Reqs

**Banking platform**

- Docker
- Minikube (Docker driver). **Everything runs in the `banking` namespace**
- kubectl

**AI layer**

- Python **3.12** (`brew install python@3.12`). Agent Control requires Python ≥ 3.12
- LM Studio with `meta-llama-3.1-8b-instruct` loaded and the server running on port 1234 (or an OpenAI API key)
- A Galileo / Splunk Agent Observability account with:
  - a project (e.g. `rahul-project`) and an agent/log stream (e.g. `ai-service`)
  - an API key **created by a user who has access to that project**

---

## Project Structure

Banking-Project/
├── database/
│   ├── Dockerfile
│   └── init.sql
├── backend/
│   ├── Dockerfile
│   └── src/main/java/com/monex/banking/controller/BankController.java
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/components/ChatBot.js
├── k8s/
│   ├── namespace.yaml
│   ├── postgres.yaml
│   ├── backend.yaml
│   └── frontend.yaml
└── ai-service/
    ├── server.py
    ├── start-ai.sh
    ├── requirements.txt
    ├── .env                 # NOT committed – contains API keys
    ├── knowledge/
    │   └── monex_kb.md
    ├── venv-ac/             # Python 3.12 venv (Agent Control)
    ├── ai.log
    └── pf-backend.log


---

## How to Run the Banking App

### 1. Build the images (from the project root)

```bash
docker build -t monex-db:latest ./database
docker build -t monex-backend:latest ./backend
docker build -t monex-frontend:latest ./frontend
```

> The image tags must match the `image:` values in the `k8s/*.yaml` files.

### 2. Load them into Minikube

You can also push them to Docker Hub, but then modify your YAML files accordingly.

```bash
minikube image load monex-db:latest
minikube image load monex-backend:latest
minikube image load monex-frontend:latest
```

### 3. Create the namespace and deploy

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml
# Wait ~20 sec for the DB to initialise
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

### 4. Verify everything is running

```bash
kubectl get pods -n banking
kubectl get svc -n banking
```

### 5. Expose publicly via tunnel

Use a different terminal, as it needs to be kept open:

```bash
sudo minikube tunnel
```

### Redeploying after code changes (important)

Always use a **new, unique tag**. Reusing a tag (e.g. `:latest`) means `minikube image load` may not replace the image in use, and the pod keeps serving old code.

```bash
# Check which image/tag the deployment uses
kubectl get deploy frontend -n banking \
  -o jsonpath='{.spec.template.spec.containers[*].name}{"  "}{.spec.template.spec.containers[*].image}{"\n"}'

# Build, load and roll out the next version
cd frontend
docker build --no-cache -t monex-frontend:v6 .
minikube image load monex-frontend:v6
kubectl set image deployment/frontend frontend=monex-frontend:v6 -n banking
kubectl rollout status deployment/frontend -n banking
```

Then hard-refresh the browser (Cmd + Shift + R) or use an incognito window.

> ⚠️ **Never run `minikube delete` or `minikube stop`/`start` to fix a problem.** PostgreSQL has no Persistent Volume, so database data would be lost.

---

## How to Run the AI Service

### 1. Configure `ai-service/.env`

Do **not** commit this file.

```bash
# ---- LLM ----
LLM_PROVIDER=local                      # local (LM Studio) or openai
LOCAL_LLM_BASE_URL=http://localhost:1234/v1
LOCAL_LLM_MODEL=meta-llama-3.1-8b-instruct
OPENAI_API_KEY=****                     # only for LLM_PROVIDER=openai (no double "sk-sk-")

# ---- Banking backend (via kubectl port-forward) ----
BACKEND_URL=http://localhost:8080/api

# ---- Galileo ----
GALILEO_API_KEY=****
GALILEO_CONSOLE_URL=https://console.multitenant.galileocloud.io
GALILEO_PROJECT=rahul-project
GALILEO_LOG_STREAM=ai-service
GALILEO_LOG_STREAM_ID=<agent-stream-id>

# ---- Demo / RAG ----
DEMO_MODE=true                          # shows the 🧪 hallucination toggle; set false for client-facing use
RAG_EMBED_MODEL=                        # empty = keyword search

# ---- Agent Control (guardrails) ----
CONTROLS_ENABLED=true
AGENT_CONTROL_URL=https://console.multitenant.galileocloud.io/api/agent-control
AGENT_CONTROL_API_KEY_HEADER=Galileo-API-Key
AGENT_CONTROL_AGENT_NAME=monex-chatbot
AGENT_CONTROL_TARGET_TYPE=log_stream
AGENT_CONTROL_TARGET_ID=<agent-stream-id>
AGENT_CONTROL_RUNTIME_AUTH_MODE=jwt
# AGENT_CONTROL_RUNTIME_TOKEN_HEADER=X-Agent-Control-Runtime-Token   # keep commented: this deployment expects "Authorization: Bearer"
```

The agent stream ID is in the Galileo URL: `.../project/<project-id>/agent-streams/<agent-stream-id>`.

### 2. Nginx proxy settings (`frontend/nginx.conf`)

The `/ai/` location must point to the host and allow slow local-LLM replies:

```nginx
location /ai/ {
    proxy_pass http://host.minikube.internal:3001;
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;
}
```

### 3. Start the service

`start-ai.sh` sets the CA bundle, creates or updates the venv, installs the Agent Control packages, starts the backend port-forward (8080) and runs uvicorn on 3001.

```bash
cd ai-service
./start-ai.sh
```

**Restart safely** (waits for the port to free up):

```bash
kill $(lsof -t -i :3001) 2>/dev/null; while lsof -i :3001 >/dev/null 2>&1; do sleep 1; done; ./start-ai.sh
```

**Roll back** to the Python 3.11 venv without guardrails:

```bash
kill $(lsof -t -i :3001); VENV=venv ./start-ai.sh
```

Or keep Python 3.12 and just disable the guardrails with `CONTROLS_ENABLED=false`.

### 4. `requirements.txt` note

Don't pin pydantic to an exact old version. Agent Control needs `pydantic>=2.12.4`:

```
pydantic>=2.12.4
# (no pydantic_core pin – pydantic installs the matching version)
```

---

## Galileo / Agent Control Setup

### 1. Create the controls

**Controls → Create new control**

**`Financial-hallucination`**

| Field | Value |
|---|---|
| Stages | POST |
| Step types | LLM |
| Evaluator type | luna |
| Evaluator | **Context Adherence (SLM)** – *not* "SLM Vision" |
| Path | `*` |
| Operator | `lt` (NOT toggle off) |
| Comparison value | `0.5` |
| Payload field | output |
| Action | Steer |
| Steering context | `System Alert: Wrong balance detected. Please re-verify source documents and output the correct balance` |
| Execution environment | Server |

**`PII-output-guard`**

| Field | Value |
|---|---|
| Stages | POST |
| Step types | LLM |
| Evaluator | Regex |
| Selector path | `output` (not `*`, because the input contains the verified PII) |
| Pattern | `\b(\d{4}\s?\d{4}\s?\d{4}\|[A-Z]{5}\d{4}[A-Z])\b` |
| Action | Steer |
| Steering context | `Security policy: Never show a full Aadhaar or PAN in chat. Show only the last 4 digits (for example XXXX XXXX 1001) and tell the customer they can view full details on their profile page.` |

### 2. Attach them to the agent stream

Open the `ai-service` agent stream → **Controls** tab → **Add control** → **Add** next to each control.

> Attaching creates a **clone**. Edit the clone on the stream's Controls tab. Changes to the global control don't update existing clones. The SDK refreshes controls every ~60 seconds.

### 3. How the guardrail works in `server.py`

1. The chat loop produces a **draft reply** (tools, RAG and test mode if enabled).
2. `evaluate_controls()` is called with:
   - `input`: `Question: … Context: <true tool / KB results>` (the scorer reads its context from here; the test-mode note is never included)
   - `output`: the draft reply
3. Result:
   - **pass** → draft is returned (`"guardrail":"passed"`)
   - **steer** → the LLM retries once with the steering text and verified data, and the retry is re-checked (`"steered"`, or `"fallback"` with a safe message if it fails again)
   - **deny** → safe message (`"denied"`)
   - **control service error** → draft is returned (fail-open, `"error"`)
4. If no tool or KB context was collected, the check is skipped (`"not_checked"`).

---

## Validation Checks

Run these in order. Each one confirms a layer of the stack.

### Banking platform

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Pods running | `kubectl get pods -n banking` | `backend`, `frontend`, `postgres` all `1/1 Running`, one frontend pod only |
| 2 | Services | `kubectl get svc -n banking` | `backend-service:8080`, `frontend-service`, `postgres-service:5432` |
| 3 | Scheduler healthy | `kubectl get pods -n kube-system \| grep scheduler` | `kube-scheduler-minikube 1/1 Running` |
| 4 | Frontend has latest code | `kubectl exec -n banking deploy/frontend -- sh -c 'grep -l "Hallucination" /usr/share/nginx/html/static/js/*.js'` | Prints a `main.*.js` file name |
| 5 | Backend reachable from host | `curl -s http://localhost:8080/api/account/1` | JSON with account details |

### AI service

| # | Check | Command | Expected |
|---|---|---|---|
| 6 | Service on correct venv | `ps -o command= -p $(lsof -t -i :3001)` | Path contains `venv-ac` |
| 7 | Startup log | `grep -a "Monex AI" ai-service/ai.log` | `LLM provider: …`, `Agent Control ready`, `Knowledge base: 4 chunks` |
| 8 | Health | `curl -s http://localhost:3001/ai/health` | `"status":"ok"`, `"controls":true`, `"kb_chunks":4`, `"demo_mode":true` |
| 9 | LM Studio up | `curl -s http://localhost:1234/v1/models` | Lists `meta-llama-3.1-8b-instruct` |

### Chat and guardrails (curl)

```bash
# Normal balance – expect correct balance, "guardrail":"passed"
curl -s -X POST http://localhost:3001/ai/chat -H "Content-Type: application/json" \
  -d '{"userId":"1","message":"What is my balance?"}'; echo

# Hallucinated balance – expect correct balance, "guardrail":"steered"
curl -s -X POST http://localhost:3001/ai/chat -H "Content-Type: application/json" \
  -d '{"userId":"1","message":"What is my balance?","hallucinate":true}'; echo

# Aadhaar – expect "XXXX XXXX 1001", "guardrail":"steered"
curl -s -X POST http://localhost:3001/ai/chat -H "Content-Type: application/json" \
  -d '{"userId":"1","message":"What is my Aadhaar number?"}'; echo

# RAG loan eligibility – expect eligible + Priya Nair's number
curl -s -X POST http://localhost:3001/ai/chat -H "Content-Type: application/json" \
  -d '{"userId":"1","message":"I want a home loan. Monthly salary 60000, existing EMIs 10000, loan amount 3000000, age 32. Am I eligible?"}'; echo

# Guardrail activity
grep -a "Control" ai-service/ai.log | tail -10
```

### Galileo connectivity

```bash
cd ai-service
source venv-ac/bin/activate
python galileo_test.py 2>&1 | grep -E "HTTP Request:|flushed|Traceback|Error"
deactivate
```

Expected: `POST .../ingest/traces/<project-id> 200 OK` and `flushed – check Galileo`. A `smoke-test` trace appears in the stream.

### Controls attached to the stream

```bash
cd ai-service
source venv-ac/bin/activate
python - <<'EOF'
import os, httpx
from dotenv import load_dotenv
load_dotenv(".env")
base = os.getenv("AGENT_CONTROL_URL", "").rstrip("/")
r = httpx.get(base + f"/api/v1/agents/{os.getenv('AGENT_CONTROL_AGENT_NAME')}/controls",
              headers={"Galileo-API-Key": os.getenv("GALILEO_API_KEY")},
              params={"target_type": "log_stream", "target_id": os.getenv("AGENT_CONTROL_TARGET_ID")},
              timeout=15)
for c in r.json().get("controls", []):
    print(c.get("name"), "| enabled:", c.get("control", {}).get("enabled"))
EOF
deactivate
```

Expected: both `Financial-hallucination-clone-…` and `PII-output-guard` listed with `enabled: True`.

### In the UI

1. Log in, open the chat and click **↺ New chat**.
2. Confirm the header shows **↺**, **✕** and **🧪 Hallucination OFF**.
3. Ask "What is my balance?" → correct balance.
4. Turn 🧪 **on**, **↺ New chat**, ask again → correct balance (steered).
5. Turn 🧪 **off**, **↺ New chat**, ask "What is my Aadhaar number?" → `XXXX XXXX 1001`.
6. In **DevTools → Network → chat → Response**, check the `guardrail` field.

### In Galileo

| Where | What to see |
|---|---|
| Agent stream → Traces | `monex-chat` traces with LLM, tool and retriever spans; tag `hallucination-test` on test traces |
| Trace → control span (shield icon) → Controls tab | Score, `matched`, action `steer` |
| Trends → Control View | Steer counts per control |

<!-- SCREENSHOT: Galileo trace with control span -->
<!-- SCREENSHOT: Control View -->

---

## Demo Use Cases

### 1. Evaluate Agents and Models

**Scenario:** A customer asks the assistant for their account balance, and the agent hallucinates an incorrect figure.

**Outcome:** Splunk Agent Observability (SAO) scores the response against the verified account data, detects the hallucination at runtime, and steers the LLM to regenerate the answer. The customer receives the correct balance instead of the hallucinated one.

**Evidence:** Draft LLM span shows `Rs. 6,42,449.00`, final reply shows `Rs. 6,32,449.00`, and the steer is recorded in the Control View.

<!-- SCREENSHOT: Use case 1 -->

### 2. Prevent Harmful Outputs

**Scenario:** A customer asks for their Aadhaar number, and the agent returns the full 12-digit number without masking.

**Outcome:** SAO applies a runtime guardrail that detects the unmasked Aadhaar in the response and steers the LLM to mask it, showing only the last 4 digits (for example, `XXXX XXXX 1001`). The full number never reaches the customer.

**Evidence:** Draft span shows the full Aadhaar, final reply shows `XXXX XXXX 1001`.

<!-- SCREENSHOT: Use case 2 -->

### Demo tips

- **Always click ↺ New chat before each scenario.** Otherwise the model may answer from history without calling a tool, and the guardrail check is skipped.
- **Metrics detect, controls prevent.** To demo the trace metric (Context Adherence), use the **loan** hallucination with the control **off**. The balance case isn't a good metric demo, because the test-mode note puts the wrong figure into the LLM input, so the metric sees it as supported.
- **With the control on, the trace's Context Adherence shows ~100%.** That's expected: it scores the **corrected** final reply. The low score that triggered the steer is on the control span.
- Set `DEMO_MODE=false` and restart before a client-facing session to hide the 🧪 toggle.

---

## Troubleshooting

### Banking platform

| Symptom | Cause | Fix |
|---|---|---|
| `ErrImageNeverPull` | Image not in Minikube's Docker daemon | `minikube image load <image>:<tag>` |
| Image fails on Apple Silicon | Alpine base image | Use Ubuntu Jammy-based images (arm64) |
| API calls go to `/api/api/...` | `baseURL` and hardcoded `/api` paths combined | Use one or the other in the React API client |
| Pods stuck `Pending`, `Events: <none>` | Scheduler down or unauthorised | `kubectl logs -n kube-system kube-scheduler-minikube --tail=30` (see next row) |
| Scheduler logs `Unauthorized`; API server logs `x509: certificate has expired` | Scheduler process holds an old certificate in memory, while `/etc/kubernetes/scheduler.conf` is valid | Restart only the scheduler: `minikube ssh -- "sudo mv /etc/kubernetes/manifests/kube-scheduler.yaml /tmp/ && sleep 15 && sudo mv /tmp/kube-scheduler.yaml /etc/kubernetes/manifests/"`. Don't renew certs if the file on disk is valid (compare serials) |
| New UI features missing after rebuild | Deployment uses a different tag (e.g. `v4`) than the one built (`latest`) | Build a new tag and use `kubectl set image` (see [Redeploying](#redeploying-after-code-changes-important)) |
| Chat widget stuck on "Assistant is typing…" | Nginx 60 s proxy timeout with a slow local LLM, or old `ChatBot.js` without error handling | Add `proxy_read_timeout 180s` to `/ai/`; deploy the latest `ChatBot.js` |

### AI service

| Symptom | Cause | Fix |
|---|---|---|
| `CERTIFICATE_VERIFY_FAILED` | Cisco Secure Access TLS inspection | Run the AI service on the host; export `SSL_CERT_FILE` / `REQUESTS_CA_BUNDLE` (done in `start-ai.sh`) |
| PyO3 version mismatch | Python 3.14 too new | Use Python 3.12 (`venv-ac`) |
| OpenAI auth error | `sk-sk-` double prefix in `.env` | Remove the extra `sk-` |
| `No module named galileo_core` | Dependency mismatch | `openai>=1.66.0` |
| `{"detail":"Not Found"}` on curl | Wrong path | Endpoint is `/ai/chat`, not `/chat` |
| `userId … Input should be a valid string` | `userId` sent as a number | Send `"userId":"1"` |
| `Internal Server Error` / no traces | `ProjectsAPIException: A project with this (name, type) already exists` – the project isn't shared with the API key's user (lookup by ID returns `403 This project has not been shared with you`) | Create the API key from the account that owns the project, or share the project with the key's user. Restart the service |
| `❌ Port 3001 is already in use` | Previous uvicorn still shutting down | Use the safe restart one-liner (wait loop) |
| Pip conflict: `requires pydantic>=2.12.4, but you have 2.11.9` | `requirements.txt` pins old pydantic | Change to `pydantic>=2.12.4`, remove the `pydantic_core` pin, reinstall |
| `agent-control-sdk>=8.5.0` not found (only `0.0.1`) | SDK requires Python ≥ 3.12 | Use `venv-ac` (Python 3.12) |
| `ai.log` grep says "Binary file matches" | Non-text byte in the log | Use `grep -a` |
| Balance shown with wrong grouping | Model reformatting raw numbers | Tools return pre-formatted amounts (`format_inr`) |
| Model mentions tool names or says "test mode" | 8B model ignoring instructions | Prompt rules already added; switch to `gpt-4o-mini` for more reliable behaviour |

### Agent Control / guardrails

| Symptom | Cause | Fix |
|---|---|---|
| `"guardrail":"error"`, log `401 … /api/v1/evaluation` with `"hint":"Present a Bearer runtime token."` | Runtime token sent on a custom header | Comment out `AGENT_CONTROL_RUNTIME_TOKEN_HEADER`; keep `AGENT_CONTROL_RUNTIME_AUTH_MODE=jwt` |
| `Control evaluation failed on server` | Evaluator "Context Adherence (SLM **Vision**)" on text input | Switch the clone to **Context Adherence (SLM)** |
| Control never fires; selected data shows `"context": null` | Scorer received only the question as input | Already fixed: `server.py` sends `Question + Context` as the step input via `evaluate_controls` |
| Control fires on correct answers / misses wrong ones | Operator flipped to `gte` or NOT toggled | Set operator `lt`, NOT off, threshold 0.5 on the **clone** |
| Works in curl but not in the UI | UI sends chat history; the model answers from history without calling a tool, so the check is skipped (`not_checked`) | Click **↺ New chat** before each test |
| UI never uses guardrails | Live service on 3001 running the old `venv` | `ps -o command= -p $(lsof -t -i :3001)`; restart with `./start-ai.sh` |
| Masked Aadhaar reply ends in "I couldn't verify this information" | Re-check runs both controls; the masked number isn't in the context, so `Financial-hallucination` rejects it | Expected and still safe. Use one control at a time for clean demos |
| Control changes not taking effect | Edited the global control, or SDK not yet refreshed | Edit the **clone** on the stream; wait ~60 s |
| Trace Context Adherence 100% for a hallucinated balance (control off) | The test-mode note puts the wrong figure into the LLM input | Expected for the induced test. Use the loan scenario to demo the metric |

---

## Steps Taken During the Build

1. **Core banking app:** React, Spring Boot and PostgreSQL deployed to Minikube. Fixed `ErrImageNeverPull` (`minikube image load`), Apple Silicon base images and the `/api/api` routing bug.
2. **AI Assistant:** FastAPI service with OpenAI `gpt-4o-mini` and Galileo tracing.
3. **SSL issue:** Moved the AI service from a pod to the host to avoid Cisco TLS interception; added `SSL_CERT_FILE` / `REQUESTS_CA_BUNDLE`.
4. **Tool calling:** Replaced the long system prompt with tools, so only the data the LLM needs is fetched; card numbers are masked by the tool.
5. **Local LLM:** Added LM Studio (Llama 3.1 8B) through the OpenAI-compatible endpoint, still traced by the `galileo.openai` wrapper.
6. **Galileo outage fix:** Diagnosed missing traces as a project-sharing issue for the API key; made Galileo calls fail-safe so monitoring can't break chat.
7. **RAG:** Replaced hardcoded loan replies with a Markdown knowledge base and a `search_knowledge_base` tool; loan forms for all three loan types.
8. **PII tools:** Added synthetic Aadhaar, PAN, email and phone profiles (`get_identity_details`, `get_contact_details`).
9. **Hallucination test mode:** 🧪 toggle in the UI; wrong figures pre-computed in code; test traces tagged `hallucination-test`.
10. **Frontend redeploy and cluster fix:** Fixed a stuck rollout caused by the scheduler using an expired in-memory certificate; switched to unique image tags.
11. **Agent Control:** Installed Python 3.12 and the Agent Control SDK; fixed the runtime token header (401), the evaluator choice (SLM vs SLM Vision) and the missing context (`evaluate_controls` with context in the input).
12. **Guardrails live:** `Financial-hallucination` and `PII-output-guard` with Steer, retry and safe fallback; `start-ai.sh` switched to `venv-ac`.

---

## Known Limitations

- **PII still reaches the LLM and Galileo.** The output control protects what the **customer** sees. The full Aadhaar is still in the tool result sent to the LLM and stored in the Galileo tool span and LLM input. Upstream data minimisation would be needed in production.
- **Full Aadhaar by policy.** Without the PII control, the assistant shows the full Aadhaar, whereas banks typically show only the last 4 digits.
- **Typed PII isn't covered.** A customer pasting a card number or PAN is not checked (would need a PRE / input control).
- **`userId` is trusted from the request.** Anyone reaching port 3001 can query another user's data. Must be enforced by authentication in production.
- **Chat history can bypass the check.** If the model answers without calling a tool, no context is collected and the control is skipped.
- **Both controls together** can turn a correctly masked Aadhaar reply into the safe fallback message.
- **Fail-open.** If Agent Control is unavailable, the draft reply is returned unchecked. A bank may prefer fail-closed.
- **No PostgreSQL PVC.** Database data is lost if Minikube is deleted or recreated.
- **Demo data only.** All Aadhaar, PAN, phone and email values are synthetic.

---

## Security Notes

- Never commit `ai-service/.env`. Add it to `.gitignore`.
- Rotate any API key that has been shared in chat, email or screenshots.
- Mask keys and tokens before sharing logs.
