# Integration Safety Rules

StackMap is designed to eventually use external sources, but every integration must preserve the local, manual, approval-first model.

## Absolute Rules

- Integrations must be read-only.
- Integrations must never write back to GitHub, Supabase, Airtable, Gmail, Apple, Google, payment systems, or any other external system.
- Integrations must never auto-confirm projects, tools, relationships, or subscriptions.
- Integrations must create suggestions first.
- The user must manually accept or dismiss each suggestion.
- Raw API keys, access tokens, refresh tokens, and secrets must never be stored in localStorage, source files, logs, screenshots, test data, or backups.
- Local sample data must not contain real secrets.
- Manual entry must continue to work without any integration configured.

## Required Suggestion Flow

Every integration must use this flow:

```text
External source read -> normalized detection -> suggestion -> manual approval -> confirmed record
```

Suggestions should include:

- Source name.
- Entity type.
- Confidence score.
- Detected fields.
- Notes explaining why it was suggested.
- Created and updated timestamps.

## Approval Requirements

Before a real integration is added:

- The integration plan must exist in StackMap.
- The source must be marked read-only.
- The user must explicitly approve connecting that source.
- Required permissions must be documented.
- Any token handling must be documented before implementation.

## Token And Secret Handling

Future token storage must be designed before implementation.

Until then:

- Do not add OAuth.
- Do not add personal access token fields.
- Do not add `.env.local` secrets for integrations.
- Do not store tokens in localStorage.
- Do not put credentials in seed data.

## Source-Specific Guardrails

### GitHub

- Read-only repository and metadata discovery only.
- Suggested records may include projects, tools, dependencies, and deployment hints.
- Do not clone repositories automatically.
- Do not inspect sibling local repositories.
- Do not push, commit, tag, open pull requests, or modify GitHub state.

### Supabase

- Read-only project metadata discovery only.
- Do not read table data unless separately approved.
- Do not write schema, storage, functions, auth config, or edge functions.
- Do not store Supabase service-role keys.

### Apple And Google App Stores

- Read-only app listing and status metadata only.
- Do not submit builds.
- Do not change app metadata.
- Do not modify pricing, subscriptions, or releases.

### Gmail And Payment Sources

- Receipt and renewal suggestions only.
- Do not send email.
- Do not modify labels, messages, payments, subscriptions, or accounts.
- Do not store raw message bodies unless specifically designed and approved.

### Airtable

- Read-only import suggestions only.
- Do not create, update, or delete Airtable records.
- Do not modify bases, tables, fields, views, automations, or interfaces.

## Implementation Checklist

Before any real integration code is merged:

- Confirm the feature works with mock runs first.
- Confirm detected data lands only in Suggestions.
- Confirm accepted suggestions require manual action.
- Confirm dismissed suggestions remain dismissed.
- Confirm build passes.
- Confirm no secrets are present in source, localStorage, logs, backups, or seed data.

## Current Status

As of this document, StackMap has no real external integrations. It only has:

- Manual records.
- Local import suggestions.
- Local mock integration runs.
- Local integration planning records.
