# Recruitee setup

## Auth

- Personal API token from Settings → Apps and plugins → API tokens  
- Header: `Authorization: Bearer {token}`  
- Base: `https://api.recruitee.com/c/{company_id|subdomain}/…`  
- Rate limit: 1000 req/min/token  

**Warning:** tokens inherit the creating user’s permissions. Prefer a dedicated integration user.

## Endpoints used

| Operation | Method | Path |
|---|---|---|
| Test / jobs | GET | `/c/{id}/offers?scope=active&view_mode=brief` |
| Search | POST | `/c/{id}/search/new/candidates` |
| Create (manual) | POST | `/c/{id}/candidates` |
| Profile fields | POST | `/c/{id}/custom_fields/candidates/{id}/fields` |
| CV update | PATCH | `/c/{id}/candidates/{id}` (multipart `candidate[cv]`) |

Do **not** use the unauthenticated Careers Site application endpoint for recruiter transfers (candidate-facing confirmation risk).

## Evidence fields

ResumeX Source, ResumeX Research Relevance, ResumeX Evidence Summary, ResumeX Profile, ResumeX Public Sources.

## Webhooks

`POST /api/talent/integrations/ats/webhooks/recruitee/{connectionId}`

Verify `X-Recruitee-Signature` = HMAC-SHA256(raw body, webhook secret).

Handled: `candidate_created`, `candidate_assigned`, `candidate_moved`, test/ping.

## Not implemented (public Core API not confirmed)

- Candidate note write  
- Application stage move as a first-class capability  

## Manual QA

1. Trial account + synthetic job  
2. Personal token from integration user  
3. Connect in `/talent/integrations`  
4. Send to ATS from Talent Mapper → preview → confirm  
5. Verify candidate assigned, profile fields present, no candidate confirmation email from Core API create  
