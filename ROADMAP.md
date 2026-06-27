# StackMap Roadmap

StackMap is a local-first reference tool for mapping projects, tools, accounts, subscriptions, deployments, and dependencies.

The product exists because real projects become hard to reason about once they depend on many services. StackMap should help a builder answer:

- What tools does this project use?
- Where is it deployed?
- What accounts or stores does it publish to?
- What paid services or subscriptions support it?
- What needs review before something breaks?

## Product Direction

StackMap should be a private, manual-first tool before it becomes anything else.

The current direction is:

- Local-first.
- Downloadable later.
- Free or low-friction for other builders to use.
- Manual entry as the source of truth.
- Strong backup/export/import workflows.
- No required cloud account.
- No required external integrations.

The KeyMatch Pro site can eventually act as the public doorway where people discover and download StackMap, but StackMap itself should remain a separate tool.

## Privacy Promise

StackMap stores sensitive operational information about apps, accounts, services, and subscriptions. The default product promise should be simple:

> Your StackMap data stays on your device unless you choose to export or share it.

This means:

- No hosted user database by default.
- No account required by default.
- No external service connection by default.
- No secrets, API keys, access tokens, or refresh tokens stored in app data.
- Export/import must remain easy and visible.

## Current State

- Next.js App Router, TypeScript, Tailwind CSS.
- Local browser storage.
- Manual CRUD for projects, tools, subscriptions, and relationships.
- Visual map using React Flow.
- Search, review-needed workflow, detail pages, CSV export, backup export/import, and import suggestions.
- Local-only mock integration runs and integration planning records.

## Near-Term Priorities

1. Make the local-first app solid.
   - Improve first-run empty state.
   - Make backup/export more prominent.
   - Warn when a user has meaningful data but no recent backup.
   - Keep import/export reliable and easy to understand.
   - Treat user-created StackMap data as the most important asset in the app.
   - Add safer backup naming and backup-status messaging before risky actions.

2. Improve manual entry speed.
   - Relationship templates for common project types.
   - Quick-add tool/project flows.
   - Better default notes and relationship labels.
   - Cleaner duplicate handling.

3. Polish the visual map.
   - Keep focused views readable.
   - Improve labels and spacing.
   - Make relationship grouping consistent.
   - Preserve simple all-map overview.

4. Prepare for public use.
   - Add a clean demo/sample data mode.
   - Create a curated demo dataset based on real indie-builder workflows.
   - Sanitize demo data before release by removing private URLs, account IDs, sensitive notes, and billing details.
   - Add reset-to-sample and clear-data flows with confirmation.
   - Add local-first/privacy messaging.
   - Improve README and user instructions.

## Desktop Packaging Path

Do not package StackMap as a desktop app until the core local web workflow feels useful and stable.

When ready, evaluate:

- Tauri for a smaller local desktop app.
- Electron if packaging speed and ecosystem support matter more than app size.

The desktop app should:

- Save data locally.
- Support export/import backups.
- Avoid required accounts.
- Work offline for core manual workflows.
- Be downloadable from a public page, likely linked from KeyMatch Pro.

## Public Distribution Idea

StackMap can eventually be presented as:

> A free local-first reference tool for mapping the tools and services behind your apps.

Possible public page:

```text
keymatchpro.com/tools/stackmap
```

That page can explain:

- Why it was built while building KeyMatch Pro and other tools.
- What problem it solves.
- That data stays local.
- How to download or run it.
- How to export backups.

## Demo Data Strategy

Public sample data can be based on the real story behind building KeyMatch Pro, LogIT, StackMap, and related tools, because that makes the product easier to understand.

The public demo dataset should be curated rather than a raw export.

It can show realistic relationships such as:

- Projects using GitHub and local development tools.
- Apps publishing to Apple Developer and Google Play Console.
- Apps depending on databases, AI tools, payment tools, ad tools, and deployment platforms.
- Review items that demonstrate why a dependency map is useful.

It must not include:

- Private URLs.
- Account IDs.
- Secrets or tokens.
- Sensitive internal notes.
- Billing details unless intentionally public.
- Anything that would create security or privacy risk.

The app should make it clear when a user is viewing demo/sample data versus their own working data.

## Integrations Position

External integrations are not a priority right now.

If added later, they must be:

- Read-only.
- Explicitly approved.
- Suggestion-based.
- Never auto-confirming detected records.
- Never storing raw secrets or tokens in StackMap data.

Useful helper features are preferred over deep integrations:

- Quick add from URL.
- CSV/JSON import into suggestions.
- Relationship templates.
- Review reminders.
- Backup prompts.

## Not Building Now

- SaaS accounts.
- Hosted user database.
- Mobile sync.
- Team permissions.
- Billing.
- Deep external integrations.
- Automatic relationship detection as confirmed data.

These can be reconsidered later only if real usage shows a clear need.

## Completion Standard

Each new feature should:

- Keep manual entry working.
- Preserve local data compatibility or migrate safely.
- Keep export/import reliable.
- Keep user data local by default.
- Pass `cmd /c npm run build`.
- Avoid touching files outside this repository.
