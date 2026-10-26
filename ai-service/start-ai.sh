#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# ⬇️ Python SSL must use Homebrew's CA bundle
export SSL_CERT_FILE=/opt/homebrew/etc/ca-certificates/cert.pem
export REQUESTS_CA_BUNDLE=/opt/homebrew/etc/ca-certificates/cert.pem

# Which venv to use:
#   venv-ac (default) = Python 3.12 + Agent Control (guardrails)
#   venv              = Python 3.11, no Agent Control (rollback: VENV=venv ./start-ai.sh)
VENV="${VENV:-venv-ac}"

if [ "$VENV" = "venv-ac" ]; then
  PYTHON_BIN=/opt/homebrew/bin/python3.12
else
  PYTHON_BIN=python3.11
fi

# Don't start a second copy if the AI service is already running
if lsof -i :3001 >/dev/null 2>&1; then
  echo "❌ Port 3001 is already in use. Stop the running service first:"
  echo "   kill \$(lsof -t -i :3001)"
  exit 1
fi

# Ensure venv exists
if [ ! -d "$VENV" ]; then
  echo "Creating $VENV with $PYTHON_BIN ..."
  "$PYTHON_BIN" -m venv "$VENV"
fi
source "$VENV/bin/activate"
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# Agent Control packages (only in the 3.12 venv), installed after requirements.txt
if [ "$VENV" = "venv-ac" ]; then
  pip install --quiet \
    "agent-control-sdk>=8.5.0" \
    "agent-control-evaluators>=8.5.0" \
    "agent-control-evaluator-galileo>=8.5.0"
  if ! python -c "import agent_control" >/dev/null 2>&1; then
    echo "⚠️  agent_control not importable – chat will run WITHOUT guardrails"
  fi
fi

# Start backend port-forward in background (if not already running)
if ! lsof -i :8080 >/dev/null 2>&1; then
  echo "Starting backend port-forward on :8080 ..."
  kubectl port-forward -n banking svc/backend-service 8080:8080 > pf-backend.log 2>&1 &
  echo $! > .pf.pid
  sleep 3
fi

# Start AI service in background (uvicorn), logging to ai.log
echo "Starting AI service on :3001 using $VENV ($(python --version)) ..."
nohup uvicorn server:app --host 0.0.0.0 --port 3001 > ai.log 2>&1 &
echo $! > .ai.pid

echo "✅ AI service PID $(cat .ai.pid) | port-forward PID $(cat .pf.pid 2>/dev/null)"
echo "   Logs: ai-service/ai.log  and  ai-service/pf-backend.log"