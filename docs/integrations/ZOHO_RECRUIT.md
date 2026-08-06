# Zoho Recruit setup

## OAuth 2.0 (API v2 only)

Env:

```
ZOHO_RECRUIT_CLIENT_ID=
ZOHO_RECRUIT_CLIENT_SECRET=
ZOHO_RECRUIT_REDIRECT_URI=https://your-host/api/talent/integrations/ats/zoho/callback
ZOHO_RECRUIT_DEFAULT_ACCOUNTS_URL=https://accounts.zoho.com
```

Connect: `GET /api/talent/integrations/ats/zoho/connect`  
Callback validates server-side state (nonce, user, expiry, single use).

## Scopes (minimum)

Use Zoho **group** scopes (granular `modules.candidates.*` names fail authorize with “Scope does not exist”):

| Scope | Why |
|---|---|
| `ZohoRecruit.modules.READ` | Jobs, candidates, duplicate search |
| `ZohoRecruit.modules.CREATE` | Create candidate / note / application |
| `ZohoRecruit.modules.UPDATE` | Associate / update |
| `ZohoRecruit.settings.READ` | Modules / fields metadata |

No `DELETE`.

## Multi-DC

Accounts + API domains are allowlisted (`lib/ats/providers/zoho/domains.ts`). User cannot enter an arbitrary API host. Persist `accounts-server`, `api_domain`, and `location` from the OAuth response.

## Key endpoints

| Operation | Method | Path |
|---|---|---|
| Jobs | GET | `/recruit/v2/Job_Openings` |
| Search | GET | `/recruit/v2/Candidates/search?criteria=…` |
| Create | POST | `/recruit/v2/Candidates` |
| Associate | PUT | `/recruit/v2/Candidates/actions/associate` |
| Notes | POST | `/recruit/v2/Notes` |
| Attachments | POST | `/recruit/v2/Candidates/{id}/Attachments` |

`ALREADY_ASSOCIATED` is treated as success for association.

## Token refresh

`getValidZohoAccessToken` refreshes with a per-connection lock, 60s expiry buffer, marks `needs_reauthentication` on invalid refresh. One retry after 401.

## Webhooks

Not claimed until a suitable Zoho notification mechanism is verified.

## Local helper

Optional: set a refresh token via env for developer self-client testing — production must use the OAuth redirect flow.
