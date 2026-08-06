# ATS Integrations — Manual QA checklist

## General

1. Career tools still load (`/career/cv`, `/career/tracker`)
2. Talent Mapper demo still runs
3. `/talent/integrations` requires login
4. Network responses never include raw tokens
5. Disconnect clears credentials (token fields empty on reconnect)

## Ashby Demo Mode (no credentials)

1. Open `/talent/integrations` → **Try Demo Mode**
2. Open Talent Mapper → open a candidate → **Send to ATS**
3. Select Ashby Demo → pick a demo job → review duplicates → preview → confirm
4. Result shows Demo Mode warning; no external network to `api.ashbyhq.com`
5. Transfer history lists the simulated transfer

## Recruitee (live)

1. Create trial + synthetic job + personal API token
2. Connect at `/talent/integrations` with company ID + token
3. Test connection → list jobs via Send to ATS
4. Transfer synthetic candidate (`[ResumeX Test] …`, `@example.invalid`)
5. Confirm Core API create (no candidate confirmation email)
6. Confirm ResumeX profile fields
7. Configure webhook secret → POST signed test event

## Zoho Recruit (live)

1. Register OAuth web client; set env vars
2. Connect via OAuth button; confirm multi-DC callback
3. List openings → transfer synthetic candidate → note appears
4. Let access token expire / force refresh → still works
5. Disconnect / reconnect

## Privacy confirmation copy

At confirm step, the processing-basis checkbox must be checked before transfer executes.
