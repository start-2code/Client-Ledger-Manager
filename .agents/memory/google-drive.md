---
name: Google Drive integration
description: Google Drive document filing system for clients. Service account auth, per-client folder provisioning, admin template editor, Documents tab.
---

## Architecture
- **Auth:** Google Service Account via `GOOGLE_SERVICE_ACCOUNT_KEY` env secret (full JSON key)
- **Drive service:** `artifacts/api-server/src/lib/drive.ts` — wraps `googleapis` v3
- **Route:** `artifacts/api-server/src/routes/drive.ts` — all `/api/drive/*` endpoints, registered in routes/index.ts as `router.use(driveRouter)`
- **DB tables:** `drive_settings` (rootFolderName, rootFolderId), `drive_folder_template` (tree nodes), `driveFolderId` column on `clients`
- **Frontend components:** `drive-admin-panel.tsx`, `drive-folder-tree-editor.tsx`, `drive-documents-tab.tsx`
- **Admin tab:** "Drive Folders" tab in `/admin` page
- **Client tab:** "Documents" tab on each client detail page

## Key endpoints
- `GET /api/drive/status` — connection check + settings
- `PUT /api/drive/settings` — update root folder name
- `GET/POST /api/drive/template` — folder template tree CRUD
- `PUT/DELETE /api/drive/template/:id` — update/delete nodes (delete cascades to descendants)
- `POST /api/drive/clients/:clientId/provision` — create folder + stamp subfolder tree
- `POST /api/drive/provision-all` — bulk provision all un-provisioned clients
- `GET /api/drive/clients/:clientId/files` — folder tree + recent files
- `GET /api/drive/clients/:clientId/search?q=` — Drive full-text search
- `POST /api/drive/clients/:clientId/upload/:folderId` — file upload (multipart)

## Setup required (user action)
1. Google Cloud Console → new project → enable Drive API
2. Create Service Account → generate JSON key
3. Add secret `GOOGLE_SERVICE_ACCOUNT_KEY` = full JSON key string
4. Share a Drive folder with the service account email
5. Set root folder name in Admin → Drive Folders to match

## Default template (seeded via API)
Accounts (Year End Accounts, Management Accounts), Tax (Corporation Tax, Self Assessment), VAT, Payroll, Correspondence (HMRC, Client), Companies House, Contracts & Engagement Letters, Misc
