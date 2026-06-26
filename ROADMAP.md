# StackMap Roadmap

StackMap is a standalone personal reference dashboard for tracking projects, tools, subscriptions, relationships, and future integration suggestions.

## Current State

- Next.js App Router, TypeScript, Tailwind CSS.
- Local browser storage only.
- Manual CRUD for projects, tools, subscriptions, and relationships.
- Visual map using React Flow.
- Search, review-needed workflow, detail pages, backups, CSV export, and import suggestions.
- Persistent suggestions queue for staged detections.
- Local-only mock integration runs.
- Integration planning records for future read-only sources.

## Core Product Direction

StackMap should become a safe personal inventory system that can eventually discover tools and relationships automatically, while keeping confirmation manual.

The long-term flow is:

```text
Read-only source -> detected suggestions -> manual review -> confirmed local records
```

No integration should directly create confirmed records.

## Near-Term Work

1. Improve suggestion review.
   - Better duplicate detection.
   - Merge suggestions into existing records.
   - Support relationship and subscription acceptance.
   - Add source-specific filtering.

2. Improve visual map.
   - Better automatic layout.
   - Group by project, category, or source.
   - Edge filtering by relationship type.
   - Cleaner labels for dense maps.

3. Improve manual data quality.
   - Add tags.
   - Add owner/environment fields.
   - Add priority and risk fields.
   - Add last-reviewed workflows for subscriptions and relationships.

4. Improve backups.
   - Backup preview before import.
   - Backup diff summary.
   - Optional CSV import into suggestions.

## Integration Order

Future integrations should be added in this order:

1. GitHub read-only planning and mock payload parity.
2. GitHub read-only connector, only after explicit approval.
3. Supabase read-only planning and mock payload parity.
4. Supabase read-only connector, only after explicit approval.
5. App Store and Google Play read-only planning.
6. Receipt/payment suggestion sources.
7. Airtable read-only import, if needed.

## Non-Goals For Now

- Authentication.
- Database storage.
- Deployment configuration.
- Write-back to external services.
- Automatic confirmation of detected records.
- Storing secrets, API keys, access tokens, or refresh tokens.

## Completion Standard

Each new feature should:

- Keep manual entry working.
- Preserve localStorage data compatibility or migrate safely.
- Keep suggestions separate from confirmed records.
- Pass `cmd /c npm run build`.
- Avoid touching files outside this repository.
