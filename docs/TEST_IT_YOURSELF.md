# Test IntuiLearn yourself

## Two verification paths

Use the automated walkthrough to validate the complete interface without credentials. Use the live walkthrough to exercise the application against a fresh Supabase project and Gemini API key. The legacy Supabase project is never contacted.

## Immediate automated walkthrough

This path needs no credentials and does not contact external services:

```bash
./intuilearn e2e
```

It starts an isolated frontend, drives signup, onboarding, dashboard, material reading, sourced chat, practice, grading, persistence failures, logout, keyboard navigation, and responsive layouts, then stops automatically.

## Live end-to-end walkthrough

### 1. Prepare fresh services

Create a new Supabase project. In its SQL editor, run these files in order:

1. `educrafters-guide/db/supabaseSchema.sql`
2. `educrafters-guide/db/seed.sql`

In Supabase Authentication URL settings, add both local redirect URLs:

- `http://127.0.0.1:8085/onboarding`
- `http://localhost:8085/onboarding`

Keep email confirmation enabled to test the full confirmation flow. For a faster local walkthrough, you may temporarily disable it in the fresh test project.

Create a new Gemini API key for this project. Do not reuse a credential from the old prototype.

### 2. Prepare the repository

From the repository root:

```bash
./intuilearn setup
./intuilearn configure
```

The prompt asks for the Supabase project URL, publishable/anon key, service-role key, Gemini API key, and optional model name. Sensitive input is hidden and saved only in ignored `.env.local` files.

Now build the database and local retrieval indexes from the bundled material:

```bash
./intuilearn ingest
./intuilearn doctor
```

The doctor must finish with `Ready` before starting the app.

### 3. Start and test

```bash
./intuilearn start
```

Open `http://127.0.0.1:8085` and follow this flow:

1. Create an account and confirm the email if confirmation is enabled.
2. Complete the academic profile and select **Distributed Systems**.
3. Open the course, select **Message queues**, and mark it complete.
4. Ask: **Why do message queues help services stay independent?**
5. Expand the source and open the cited material.
6. Generate a short practice quiz, answer it, and review the explanation.
7. Return to the dashboard and confirm that course progress and quiz results remain visible.
8. Refresh to verify session restoration, then sign out.

Press `Ctrl+C` in the terminal that runs `start`; it stops the frontend and API together.

## Troubleshooting

- **Doctor reports placeholder values:** run `./intuilearn configure` again.
- **Ingestion says the course does not match:** apply both SQL files to the fresh project and confirm the seed created `Distributed_Systems` as course ID `1`.
- **Confirmation returns to the wrong page:** add both redirect URLs listed above to Supabase Auth.
- **The assistant or quiz reports a generation failure:** confirm the Gemini key and configured model are enabled for the same new project.
- **Port 5055 or 8085 is busy:** stop the program using that port, then rerun `./intuilearn start`.
- **You only want to validate the code:** run `./intuilearn check` for backend tests, type checking, linting, build, dependency checks, and browser tests.
