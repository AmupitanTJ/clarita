# Clarita

Clarita is a gentle, Scripture-grounded companion for personal reflection and Bible study.

This repository currently contains the first interactive product slice based on the Clarita Product Blueprint v1.0. It demonstrates the mobile-first brand system, guest conversation entry, HEART response structure, contextual Scripture cards, private saved items, feedback, and privacy settings.

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
- Reflections are not persisted. Only passages, notes, prayers, preferences, and feedback that the user explicitly chooses are stored.
- Voice and licensed Scripture-provider integration remain deferred until product governance and provider choices are approved.

## Next production gates

1. Review and approve `docs/RESPONSE_CONSTITUTION.md` with the theological and safeguarding council.
2. Confirm Scripture provider and translation licensing.
3. Approve high-risk safety flows and country-resource provider.
4. Enable Supabase **Anonymous Sign-Ins** and **Manual Linking** under Authentication settings, then test the guest-to-email confirmation flow.
5. Add tested self-service export and account/data deletion actions.

## Supabase

- Project: `Clarita`
- Project reference: `dqdcfpxrkxqehnaojxjp`
- Region: London (`eu-west-2`)
- Cost at creation: `$0/month`
- Tables: `profiles`, `saved_passages`, `private_notes`, `response_feedback`
- Security: row-level security enabled on every table; unauthenticated Data API access revoked.
- Account access: Talk, Saved, and personal history require a confirmed email account. Legacy guest identities can link an email without changing their user ID, preserving existing history.
- Local configuration: copy `.env.example` to `.env.local`; public Supabase browser values may use the included project defaults.
