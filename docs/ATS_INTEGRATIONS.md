# ATS Integrations — ResumeX Talent

ResumeX discovers and evaluates talent **outside** the ATS. The ATS remains the system of record.

## Product purpose

Recruiters use Talent Mapper / Sourcing Copilot to inspect evidence, shortlist researchers, then **Send to ATS**:

1. Choose connected ATS  
2. Choose job  
3. Review duplicates  
4. Preview (read-only)  
5. Confirm  
6. Create/reuse candidate → associate to job → attach evidence → store mappings  

## Shared architecture

```
components/talent/ats/*          UI (no provider business logic)
app/api/talent/integrations/ats  Authenticated API
lib/ats/types.ts                 Provider-neutral domain model
lib/ats/adapter.ts               Adapter contract
lib/ats/registry.ts              getAtsAdapter(connectionId)
lib/ats/transfer.ts              Preview + idempotent saga
lib/ats/providers/{recruitee,zoho,ashby}
```

No candidate card instantiates a provider client. Decrypted credentials never reach the browser.

## Connection ownership

ATS connections belong to the authenticated **User** (no Organization model yet). Every route checks session + ownership.

## Credential encryption

- `ATS_CREDENTIAL_ENCRYPTION_KEY` — 32-byte key, base64  
- `ATS_CREDENTIAL_ENCRYPTION_KEY_VERSION` — integer (default 1)  
- AES-256-GCM via Node `crypto`  
- Format: `version | iv | authTag | ciphertext` (base64url)

Generate a key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Transfer preview

`POST .../transfers/preview` performs **reads only** (jobs, duplicate search, payload preview). Mutations require `confirmed: true` and `confirmProcessingBasis: true`.

## Duplicate rules

1. Existing ResumeX mapping  
2. Exact email  
3. Alternate email  
4. Stable profile URL / ORCID when supported  
5. Name-only (never auto-reuse)  

Exact email duplicates are never auto-created as a second record.

## Idempotency & partial failure

Idempotency key = SHA-256(`connectionId|localCandidateKey|externalJobId|ats-transfer-v1`).

Saga steps persist external IDs after each successful mutation. Partial success can be resumed via `.../transfers/[transferId]/resume`.

## Evidence

`buildAtsEvidencePlainText` / `Html` / `Fields` — concise, provenance-preserving, no full abstracts, no invented employment/authorization.

## Providers

| Provider | Auth | Demo | Webhooks |
|---|---|---|---|
| Recruitee | Bearer personal token | — | HMAC `X-Recruitee-Signature` |
| Zoho Recruit | OAuth 2.0 + refresh | — | Not claimed yet |
| Ashby | Basic (API key:) | DemoAshbyAdapter | HMAC `Ashby-Signature` |

See:

- [docs/integrations/RECRUITEE.md](./integrations/RECRUITEE.md)
- [docs/integrations/ZOHO_RECRUIT.md](./integrations/ZOHO_RECRUIT.md)
- [docs/integrations/ASHBY.md](./integrations/ASHBY.md)

## Environment variables

```
ATS_CREDENTIAL_ENCRYPTION_KEY=
ATS_CREDENTIAL_ENCRYPTION_KEY_VERSION=1
ZOHO_RECRUIT_CLIENT_ID=
ZOHO_RECRUIT_CLIENT_SECRET=
ZOHO_RECRUIT_REDIRECT_URI=
ZOHO_RECRUIT_DEFAULT_ACCOUNTS_URL=https://accounts.zoho.com
ALLOW_LIVE_ATS_TESTS=false
```

Do not put customer Recruitee/Ashby tokens in `.env` for production — connect via the UI.

## Testing

```bash
npm test                 # includes lib/ats/__tests__
npm run test:ats:e2e     # Playwright-style smoke (dev server required)
```

Live opt-in (never in CI):

```bash
ALLOW_LIVE_ATS_TESTS=true npm run test:ats:recruitee:live
ALLOW_LIVE_ATS_TESTS=true npm run test:ats:zoho:live
ALLOW_LIVE_ATS_TESTS=true npm run test:ats:ashby:live
```

## Privacy

- No automatic ATS writes from search results  
- No automatic candidate email  
- No inferred protected characteristics / work auth / availability  
- Disconnect removes encrypted credentials  

## Known limitations

- Recruitee: no public Core API note-write; evidence uses profile fields. Stage move not claimed.  
- Zoho: webhooks not implemented; attachment support is edition-dependent.  
- Ashby live: requires customer API key; Demo Mode covers UI without network.  
- Résumé bytes are not yet loaded from Blob storage in the transfer execute path (warned as non-fatal).  
- Future sandbox for Ashby: set `mode=sandbox` with sandbox key — no UI branches required.

## Adding a provider

1. Implement `AtsAdapter`  
2. Register in `lib/ats/registry.ts`  
3. Extend capability matrix  
4. Add connect route + settings card  
5. Add contract tests + fixtures  
