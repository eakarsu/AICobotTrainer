#!/bin/bash

# ============================================================
# AI Cobot Trainer - Start Script
# No-code robot arm programming via demonstration
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════╗"
echo "║           🤖 AI Cobot Trainer                     ║"
echo "║   No-Code Robot Arm Programming Platform          ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Environment loaded${NC}"
else
  echo -e "${RED}✗ .env file not found!${NC}"
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# ============================================================
# Kill processes on used ports
# ============================================================
echo -e "\n${YELLOW}🔄 Cleaning up ports...${NC}"

kill_port() {
  local port=$1
  local pids=$(lsof -ti tcp:$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  ${YELLOW}Killing process on port $port (PID: $pids)${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

echo -e "${GREEN}✓ Ports $BACKEND_PORT and $FRONTEND_PORT are free${NC}"

# ============================================================
# Check PostgreSQL
# ============================================================
echo -e "\n${BLUE}🐘 Checking PostgreSQL...${NC}"

if command -v pg_isready &> /dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
  else
    echo -e "${YELLOW}⚠ PostgreSQL not running. Attempting to start...${NC}"
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
      sleep 2
    fi
  fi
fi

# ============================================================
# Setup Database
# ============================================================
echo -e "\n${BLUE}🗄️  Setting up database...${NC}"

DB_NAME="cobot_trainer"
DB_USER="cobot_user"
DB_PASS="cobot_pass"

# Create user and database if they don't exist
psql postgres -tc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" 2>/dev/null | grep -q 1 || \
  psql postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true

psql postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null | grep -q 1 || \
  psql postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true

psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
psql $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null || true

echo -e "${GREEN}✓ Database ready${NC}"

# ============================================================
# Install Dependencies
# ============================================================
echo -e "\n${BLUE}📦 Installing dependencies...${NC}"

cd "$SCRIPT_DIR/backend"
if [ ! -d "node_modules" ]; then
  echo -e "  ${CYAN}Installing backend dependencies...${NC}"
  npm install
else
  echo -e "  ${GREEN}✓ Backend dependencies already installed${NC}"
fi

cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo -e "  ${CYAN}Installing frontend dependencies...${NC}"
  npm install
else
  echo -e "  ${GREEN}✓ Frontend dependencies already installed${NC}"
fi

cd "$SCRIPT_DIR"

# ============================================================
# Seed Database
# ============================================================
echo -e "\n${BLUE}🌱 Seeding database...${NC}"
cd "$SCRIPT_DIR/backend"
node seed.js
echo -e "${GREEN}✓ Database seeded with 225 records (15 items × 15 tables)${NC}"

# ============================================================
# Start Services with Hot Reload
# ============================================================
echo -e "\n${PURPLE}🚀 Starting services with hot reload...${NC}"

cd "$SCRIPT_DIR"

# Start backend with nodemon (watches for changes)
echo -e "  ${CYAN}Starting backend on port $BACKEND_PORT (nodemon)...${NC}"
cd "$SCRIPT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!

# Start frontend with Vite (built-in HMR)
echo -e "  ${CYAN}Starting frontend on port $FRONTEND_PORT (Vite HMR)...${NC}"
cd "$SCRIPT_DIR/frontend"
npx vite --port $FRONTEND_PORT --host &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"

# ============================================================
# Cleanup handler
# ============================================================
cleanup() {
  echo -e "\n${YELLOW}🛑 Shutting down AI Cobot Trainer...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  kill_port $BACKEND_PORT
  kill_port $FRONTEND_PORT
  echo -e "${GREEN}✓ Shutdown complete${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# ============================================================
# Display Info
# ============================================================
sleep 3
echo -e "\n${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🤖 AI Cobot Trainer is running!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "  ${CYAN}Frontend:${NC}  http://localhost:$FRONTEND_PORT"
echo -e "  ${CYAN}Backend:${NC}   http://localhost:$BACKEND_PORT"
echo -e "  ${CYAN}API Docs:${NC}  http://localhost:$BACKEND_PORT/api/health"
echo -e ""
echo -e "  ${YELLOW}Login:${NC}     admin@cobottrainer.com / admin123"
echo -e "  ${YELLOW}AI Model:${NC}  $OPENROUTER_MODEL"
echo -e ""
echo -e "  ${PURPLE}Hot reload enabled - changes auto-refresh!${NC}"
echo -e "  ${YELLOW}Press Ctrl+C to stop${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"

# Wait for background processes
wait
