# StackMap

StackMap is a local-first reference tool for mapping the projects, tools, accounts, subscriptions, deployments, and dependencies behind apps and websites.

It is designed for builders who need a private place to answer questions like:

- What tools does this project use?
- Where is it deployed?
- What accounts does it publish to?
- What subscriptions support it?
- What dependencies need review?

## Product Direction

StackMap is manual-first and local-first.

The current app runs as a local web app. The longer-term goal is to make it available as a downloadable desktop tool, with the KeyMatch Pro site acting as a public place where people can discover and download it.

StackMap is not currently intended to be a SaaS product. External integrations are not the priority. If integrations are added later, they should be read-only, explicit, and suggestion-based.

## Local Data Behavior

Current storage:

- Data is saved in this browser profile using localStorage.
- Tabs and windows in the same browser profile stay in sync.
- Different browsers, browser profiles, and computers do not automatically sync.
- A full backup JSON file is the safest way to move or preserve data.

Important:

- Browser cleanup can remove local data.
- Private/incognito browser windows use separate temporary storage.
- Export a full backup before major changes or before clearing browser data.

The future desktop version should store data locally in an app-owned data file or local database rather than relying on browser localStorage.

## Privacy Promise

StackMap should keep this default promise:

> Your StackMap data stays on your device unless you choose to export or share it.

The app should not store raw API keys, access tokens, refresh tokens, or secrets in app data, backups, logs, screenshots, or sample records.

## Running Locally

On Windows, use the launcher:

```powershell
.\Start-StackMap.cmd
```

This starts StackMap, opens `http://localhost:3000`, and closes the launcher window automatically. StackMap keeps running in the background.

To stop the launcher-started server:

```powershell
.\Stop-StackMap.cmd
```

Install dependencies:

```powershell
npm install
```

Start the local app:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000/map
```

Leave the terminal running while using the app.

## Backups

Use `Settings -> Export Full Backup` to download a full JSON backup.

Use `Settings -> Import Full Backup` to restore or move data into another browser profile.

The app tracks the last local save and last full backup in Settings. If data has changed since the last backup, StackMap shows a reminder.

## Sample Data

New local workspaces start empty.

Use `Settings -> Load Sample Data` to explore the app with demo records. Loading sample data replaces current local data, so export a backup first if you want to keep existing work.

Public demo data should be curated and sanitized before release. Do not publish raw working data without removing private URLs, account IDs, sensitive notes, billing details, or anything security-sensitive.

## Verification

Before committing feature work, run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

## Current Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- React Flow
- Browser localStorage

## Non-Goals For Now

- Required user accounts.
- Hosted user database.
- Mobile sync.
- Billing.
- Team permissions.
- Deep external integrations.
- Automatic confirmation of detected tools or relationships.
