#!/bin/sh
wget -qO- "http://127.0.0.1:${PORT:-43124}/api/health" | grep -q '"ok":true'
