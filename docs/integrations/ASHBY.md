# Ashby setup

## Modes

1. **Demo Mode** — `DemoAshbyAdapter`, no credentials, no network. Banner: “Ashby Demo Mode — No external ATS data was modified.”  
2. **Live** — API key via Basic auth (`apiKey:` empty password)  
3. **Sandbox** (future) — same adapter, `mode=sandbox`, sandbox key only  

## Auth

```
POST https://api.ashbyhq.com/{method}
Authorization: Basic base64(apiKey:)
Accept: application/json; version=1
Content-Type: application/json
```

## Required permissions

- `jobsRead`  
- `candidatesRead`  
- `candidatesWrite`  

Optional: `hiringProcessMetadataRead`, `organizationRead`, act-on-behalf-of, confidential jobs, private fields.

## Endpoints used

| Operation | Method path |
|---|---|
| Jobs | `job.list` |
| Search | `candidate.search` |
| Create | `candidate.create` |
| Application | `application.create` |
| Note | `candidate.createNote` |
| Custom fields | `customField.setValues` |
| Resume | `candidate.uploadResume` |
| Stages | `interviewStage.list` |
| Move | `application.changeStage` |

## Webhooks

`POST /api/talent/integrations/ats/webhooks/ashby/{connectionId}`

Verify `Ashby-Signature: sha256={digest}` over raw body.

Handled: `applicationUpdate`, `candidateStageChange`, `candidateHire`, `candidateDelete`, `candidateMerge`, ping.

## Demo QA

1. `/talent/integrations` → Try Demo Mode  
2. Talent Mapper → Send to ATS → select Demo → pick job → duplicates → preview → confirm  
3. Confirm result warnings include Demo Mode line  
4. Transfer history lists simulated transfer  

## Live QA

Requires customer API key. Prefix synthetic candidates with `[ResumeX Test]`, use `@example.invalid` emails.
