# Nimiq Mini Apps Competition — Judging Criteria

Source: https://miniappscompetition.com/scoring · Total **105 points**

Scored by Nimiq Community Council Members.

## Design & UX — 25

| Criterion | How Tab satisfies it |
|---|---|
| First impression | Thermal-receipt brand (Mulish + Space Mono, paper/ink/gold tokens) — see `brand.md` |
| Visual design | Shared tokens in `globals.css`; Rive + Motion micro-interactions on CTAs / paid / load |
| Navigation | Three jobs only: create → board → pay; no settings/account screens |
| Mobile experience | 390px receipt shell, sticky CTAs, safe-area padding, wake-lock on QR |
| Onboarding | Zero accounts; host pastes address or auto-fills inside Nimiq Pay; guest one-tap or copy+QR |

## Functionality — 25

| Criterion | How Tab satisfies it |
|---|---|
| Real NIM settlement | Guests pay host address on mainnet; board flips from poller match (`/api/tabs/[code]/sync`) |
| Works first try | Fallback mode outside Nimiq Pay; no blank screens; 2.5s provider timeout |
| Integration depth | `init`, `listAccounts`, `sendBasicTransactionWithData`, `sign`, `requestDeviceIdentifier` |
| Stability | Idempotent matchers A/B; mismatch accept/reject; expired tabs refuse; offline board stays honest |

## Usefulness & originality — 25

| Criterion | How Tab satisfies it |
|---|---|
| Problem | Clears restaurant debt at the table, not a ledger |
| Originality | Signed settlement receipt (`/r/CODE`) independently verifiable via `@nimiq/core` |
| Audience | Groups of 3–8 who eat out; host is the only required Nimiq Pay user |

## Marketing & distribution — 25

| Criterion | How Tab satisfies it |
|---|---|
| Distribution mechanic | Every tab invites guests who may not have Nimiq Pay yet |
| Fallback as product | Non-Nimiq pay page works from any wallet; honest install CTA after pay |
| Share surfaces | OG image (`opengraph-image.tsx`); Web Share on host board; QR screen |
| Demo | Real restaurant bill video, launch thread, Skool + Forum *(Day 6 — operator)* |

## Bonus — 5

Community: Sip & Ship attendance, public build log *(operator)*.

## Performance scale

Outstanding · Strong · Competent · Developing · Insufficient · Not demonstrated

## Hard rules (from /rules)

- Must integrate Nimiq Pay and support USDT, NIM, or both. **NIM earns bonus.**
- Logo alone ≠ integration.
- Fully functional on first try. No prototypes or mockups.
- No hardcoded secrets. Public GitHub, MIT.
- Open worldwide except OFAC-sanctioned jurisdictions.
