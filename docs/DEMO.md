# Repeatable demo

Prepare the fresh Supabase project, ingest the bundled course, and start both Flask ports plus the Vite server using [SETUP.md](SETUP.md).

1. Open the landing page and point out the real product preview and three-step study flow.
2. Choose **Start learning**, create an account, and follow the confirmation link if email confirmation is enabled.
3. Complete the academic profile, select **Distributed Systems**, and continue to the dashboard.
4. Open the course. In **Materials**, select **Message queues** and mark the chapter complete. Return to the dashboard to show the same calculated progress.
5. Open **Assistant** and ask: “Why do message queues help services stay independent?” Expand the source list and open the cited material.
6. Start **Practice**, select a question type and difficulty, answer the quiz, and show the explanation in review. Return to the dashboard to show the persisted result.
7. Refresh the browser to demonstrate session restoration and persisted progress, then sign out.

Recommended captures are the landing page, dashboard, material preview, sourced answer, and quiz review. Automated captures from the verified responsive flow are in `docs/screenshots/`.

## Expected limitations

- Prepared course material is ingested from the command line; browser upload is intentionally out of scope.
- Scanned PDFs require OCR before ingestion.
- Source references identify the material and chapter. They do not claim page-level precision because ingestion does not preserve reliable page metadata.
- Speech input depends on browser support and microphone permission; text study flows remain available when speech is unavailable.
- Live behavior depends on fresh external credentials and provider availability. Automated browser tests use deterministic API fixtures and do not establish external-service availability.
