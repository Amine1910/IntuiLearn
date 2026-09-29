# Setup

## 1. Requirements

- Python 3.11
- Node.js 20 or newer
- A fresh Supabase project with the `vector` extension available
- A new Gemini API key; do not reuse credentials from the prototype

The old Supabase project is not needed and must not receive this schema.

## 2. Install dependencies

The recommended setup command installs both dependency sets, installs Chromium for browser verification, and creates ignored local environment files:

```bash
./intuilearn setup
./intuilearn configure
```

The configuration prompt writes both ignored environment files and hides the service-role and Gemini keys while you type. You can instead use the manual copy-and-edit steps below.

The equivalent manual commands are:

```bash
python3.11 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt

cd educrafters-guide
npm ci
cd ..
```

`backend/requirements.lock.txt` records the resolved Python environment used for verification. `package-lock.json` is the frontend lockfile.

## 3. Create the database

In a fresh Supabase project's SQL editor, run these files in order:

1. `educrafters-guide/db/supabaseSchema.sql`
2. `educrafters-guide/db/seed.sql`

Enable email confirmation in Supabase Auth for the production-like flow. Add `http://localhost:8085/onboarding` to the allowed redirect URLs.

The signup trigger creates the numeric application user linked to the Auth UUID. The `complete_onboarding` RPC saves the academic profile and enrollments in one transaction, so onboarding can safely resume after confirmation or refresh.

## 4. Configure local environments

```bash
cp backend/.env.example backend/.env.local
cp educrafters-guide/.env.example educrafters-guide/.env.local
```

Fill in the fresh project URL and publishable/anon key in both files. Put `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` only in `backend/.env.local`. The frontend must contain no service-role or provider credentials.

The configured default model is `gemini-3.8-flash`. Change `GEMINI_MODEL` if the fresh project exposes a different supported model. `DATA_DIR` is resolved relative to `backend/` when the servers are started from that directory.

## 5. Ingest the demo course

The first run downloads `sentence-transformers/all-MiniLM-L6-v2`. Run the command from `backend/` so configuration and generated data use predictable paths:

```bash
cd backend
.venv/bin/python FINAL_PROCESSING.py \
  --course-dir ../demo/Distributed_Systems \
  --course-name Distributed_Systems \
  --course-id 1 \
  --targets both \
  --skip-llm
```

Confirm that course ID `1` and name `Distributed_Systems` match the seed before ingestion. Omit `--skip-llm` to use Gemini for clarity rewriting and semantic sections. The CLI also supports `--targets supabase` and `--targets faiss`.

Re-running ingestion replaces the course's Supabase chunks transactionally and publishes a new local index version. Stable material and chunk IDs prevent duplicate records.

After filling both environment files, the repository runner performs the same ingestion and checks the rest of the live setup first:

```bash
./intuilearn ingest
./intuilearn doctor
```

## 6. Start the application

The recommended command starts the Flask API and Vite together, waits for the API health check, and stops both processes on `Ctrl+C`:

```bash
./intuilearn start
```

Open `http://127.0.0.1:8085`.

The equivalent manual commands use two terminals:

```bash
cd backend
.venv/bin/flask --app app:create_app run --host 127.0.0.1 --port 5055
```

```bash
cd educrafters-guide
npm run dev
```

The application exposes chat, materials, and quiz routes from the same Flask process.

## 7. Verify

```bash
cd backend
.venv/bin/python -m pytest -q
.venv/bin/python -m pip check

cd ../educrafters-guide
npm run typecheck
npm run lint
npm test
npm run build
npm audit --audit-level=moderate
npm run test:e2e
```

The Playwright suite verifies the product flow at 375, 768, and 1440 pixels, along with keyboard focus, reduced motion, empty and failure states, failed question retry, draft persistence, and interrupted quiz-result saves.

From the repository root, `./intuilearn check` runs the same backend, frontend, dependency, and browser checks. `./intuilearn e2e` runs only the credential-free browser suite.
