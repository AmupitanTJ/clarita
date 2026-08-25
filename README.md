# Clarita

Clarita is a gentle, Scripture-grounded companion for personal reflection and Bible study.

This repository contains the first interactive product slice based on the Clarita Product Blueprint v1.0. It includes the mobile-first brand system, required passwordless email accounts, persistent conversations, HEART response structure, contextual Scripture cards, private saved items, feedback, and privacy settings.

Production: [clarita-pi.vercel.app](https://clarita-pi.vercel.app)

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Prototype boundaries

- Live OpenAI Responses API generation for HEART guidance, with structured output and reviewed fallback content.
- Local emergency-risk routing runs before generation; emergency wording is deterministic.
- Public-domain World English Bible excerpts for prototyping only.
- Conversations are saved automatically to the signed-in account for future reference. Explicitly saved passages and private notes remain separate library items.
- Voice and licensed Scripture-provider integration remain deferred until product governance and provider choices are approved.

## Next production gates

1. Review and approve `docs/RESPONSE_CONSTITUTION.md` with the theological and safeguarding council.
2. Confirm Scripture provider and translation licensing.
3. Approve high-risk safety flows and country-resource provider.
4. Configure custom SMTP and test passwordless email sign-in delivery end to end.
5. Add tested self-service export and account/data deletion actions.

## Supabase

- Project: `Clarita`
- Project reference: `dqdcfpxrkxqehnaojxjp`
- Region: London (`eu-west-2`)
- Cost at creation: `$0/month`
- Tables: `profiles`, `conversations`, `conversation_messages`, `saved_passages`, `private_notes`, `response_feedback`
- Security: row-level security enabled on every table; unauthenticated and anonymous personal-data access is blocked.
- Account access: Talk, Saved, and personal history require a confirmed email account. Legacy guest identities can link an email without changing their user ID, preserving existing history.
- Local configuration: copy `.env.example` to `.env.local`; public Supabase browser values may use the included project defaults.
