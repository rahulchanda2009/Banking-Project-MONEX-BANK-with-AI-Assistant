#!/usr/bin/env bash
cd "$(dirname "$0")"

[ -f .ai.pid ] && kill "$(cat .ai.pid)" 2>/dev/null && rm -f .ai.pid && echo "Stopped AI service"
[ -f .pf.pid ] && kill "$(cat .pf.pid)" 2>/dev/null && rm -f .pf.pid && echo "Stopped port-forward"