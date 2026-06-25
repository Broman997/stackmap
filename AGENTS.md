# StackMap Codex Instructions

## Absolute safety boundary

This repository is a brand-new standalone reference tool.

Only work inside this folder:

C:\Users\Rudi.Broman997\Projects\stackmap

Do not read, edit, copy, delete, rename, move, scan, import, or run commands against files outside this repository.

Do not touch any existing apps, websites, repositories, Airtable bases, Supabase projects, GitHub repos, App Store projects, Google Play projects, or production systems.

Do not inspect or modify sibling folders under:

C:\Users\Rudi.Broman997\Projects

This includes, but is not limited to:
- KeyMatch Pro
- LogIT
- Home Inventory
- OpportunityRadar
- Guitar Family Tree
- Cosmo-related projects
- any existing website or app repo

## Product purpose

StackMap is a personal reference dashboard for tracking tools, apps, websites, subscriptions, and relationships.

It is not part of any production app or website.

## Build rules

- Manual entry must work before automated imports.
- The first version must not connect to GitHub, Supabase, Gmail, Apple, Google, Airtable, or any external account.
- GitHub, Supabase, App Store, Google Play, Gmail, and payment imports will be added later as read-only, approval-based features.
- Never store raw API keys, access tokens, refresh tokens, or secrets in the database, browser localStorage, logs, screenshots, or test data.
- Use .env.local for local secrets only.
- Use .env.example for placeholder environment variable names.
- Every imported/detected tool must be shown as a suggestion first.
- Never auto-confirm detected tools or relationships.
- Show planned commands before running them.
- Keep changes small and explain which files changed after each step.

## MVP direction

Build StackMap first as a local manual reference tool with:
- projects
- tools
- subscriptions
- relationships
- a visual map
- manual add/edit/delete

No external integrations in the first version.
