# Candidate: Goal Resources (goods/services layer) — commerce as vault_items

**Feature area:** Projects (home: the shared-pact vault; expands to goal vaults)
**Status:** Candidate (concept — not signed off, not scheduled)
**Logged:** 2026-09-24

---

## The idea

Surface **goods/services suggestions tied to a goal** — "become fit" → a gym,
supplements to research, a stretch routine — **without a new section.** They
appear as **confirmable Vault items** (a `link`/`insight` with commerce
metadata), relevance-gated to the goal's active Tasks/milestones, that the user
accepts or dismisses.

**First home: the shared-pact vault** (see `goals/shared-goals.md`). When one
partner confirms "this stretch routine worked," it's already visible to the
other — commerce rides on real peer endorsement instead of a push. Expand to
solo goal vaults after the pattern proves out.

This is a **marketing/monetization layer disguised as R&D help** — and the
disguise is the point: it must read as *"resources that move this goal,"* never
as ads.

---

## Why it fits Ohara

- **Zero new surface, zero new pillar.** `vault_items` is already a typed union
  (`types/vault.ts`): `'note' | 'link' | 'document' | 'insight' | 'action_update'`.
  A commercial resource is a `link`/`insight` carrying commerce metadata — an
  additive flavor, not a new object.
- **The confirm-pattern is already the mechanism.** CLAUDE.md: AI-suggested
  content requires user confirmation (`metadata.confirmed`), and `feedback.pending`
  exists for unconfirmed-suggestion banners. A suggested resource is the same
  draft-then-confirm flow — and a **confirmed** commerce item is a high-intent,
  opt-in signal (exactly the R&D data worth having).
- **The targeting signal is first-party and better than any ad network.** Ohara
  knows the goal is literally "5k in 2 months" and which Tasks are active. That's
  why embedding commerce *inside goals* is strategically right, not just tidier —
  the structured goal/task/milestone graph is the moat.
- **Shared vault = organic amplification.** A resource one partner finds useful
  becomes social proof to the other. Best-possible acquisition channel, and a
  direct consequence of the shared-pact-vault decision.

---

## The make-or-break decision: relevance-gating (the "not-ads" firewall)

Ohara's whole value is a **private growth OS, not social media.** The moment a
suggestion feels like an ad, it poisons that trust — and trust is the entire
asset. So:

- A resource **only surfaces if it maps to an active Task or milestone.** Fitness
  goal with a strength Task → protein/gym is fair game; a random product is not.
- This is the same test as "no dead-end features": a bare product nudge is a dead
  end; a resource that plugs into a Task you're already doing is alive on arrival.
- Relevance-gating is not just ethics — **it's the conversion engine.** Gated,
  useful resources convert far better than untargeted ones.

The suggestion is proposed by AI through the single chokepoint (`lib/ai/client.ts`),
Haiku-tier, **suggestions only**, user confirms — never auto-inserted into a vault.

---

## Monetization — the elaboration

### Three ways it can make money (in order of trust-risk)

1. **Affiliate commission** — tag the resource link; a click/purchase pays a cut.
   Lowest friction, lowest trust risk. **Start here.**
2. **Sponsored placement** — a partner pays for a slot. More revenue, but the
   instant it isn't relevant it reads as an ad. Gate hard behind relevance.
3. **Marketplace take-rate** — broker the transaction, skim a fee. Highest
   revenue, highest build cost + liability. Much later, if ever.

### Recommended posture: **neutral resources first**

Ship as "resources for this goal"; affiliate/partner data is a **metadata layer
on the vault_item row**, added quietly under the hood. "Neutral" means *framing +
relevance-gating*, **not** hiding the commercial relationship —
affiliate/sponsored rows are **always disclosed** (FTC + trust). Explicit
"marketplace / recommended products" framing is a Phase-2 intensification *after*
trust and volume exist, not a starting posture.

### Why neutral-first is a business argument, not just taste

- Protects the trust that makes people put real goals into Ohara at all.
- Consented, confirmed commerce items are premium, first-party ad inventory
  *because* they're opt-in.
- Peer endorsement in the shared vault beats any paid placement on conversion.

---

## Risks (ranked, tied to architecture rules)

1. **Trust collapse.** Untargeted or undisclosed commerce reads as ads and breaks
   the "private growth OS" promise. Relevance-gating + disclosure are load-bearing,
   not polish.
2. **Dead-end suggestions.** A resource with no path to act (no Task/milestone it
   plugs into) is exactly the failure mode CLAUDE.md forbids. Gate on active
   Tasks/milestones; provide dismiss/skip from day one.
3. **AI-confirmation rule.** Resources are **suggestions only**; never auto-insert
   into a vault. Reuse `metadata.confirmed` / `feedback.pending`. This is an
   L3 AI-output-contract touch → DECISIONS.md.
4. **Prompt-injection / bad links.** AI-proposed URLs are untrusted; the human
   confirm gate is the safety net, and links should be validated/allow-listed by
   category rather than free-form model output.
5. **Disclosure & compliance.** Affiliate/sponsored labeling is mandatory;
   health/fitness product claims carry their own regulatory surface — keep
   Ohara's copy as "resources to research," not medical/efficacy claims.
6. **Provenance / cost.** Commerce metadata (partner, affiliate id, sponsored
   flag) belongs on the vault_item as structured fields, not free text. Suggestion
   generation is a Haiku-tier call — cheap, but still routed through
   `lib/ai/client.ts` for logging/cost.
7. **Scope creep into a marketplace.** Resist jumping to take-rate/checkout;
   that's a different product with payments, liability, and RLS implications.

---

## Recommendation

Build as a **commerce-metadata flavor of `vault_items`**, AI-suggested (Haiku),
relevance-gated to active Tasks/milestones, user-confirmed, disclosed, homed in
the **shared-pact vault first** (peer-endorsement amplifier), expanding to solo
goal vaults once quality is proven. Monetize via **affiliate first**, neutral
framing, explicit marketplace deferred.

**Open questions**
- Placement rationale: this candidate lives in `projects/` because Vaults are
  most elaborated at the Project level and the first home is the (Project-vault-
  derived) shared-pact vault — but the concept is fundamentally goal-scoped. Move
  to `goals/` if that reads truer.
- Exact commerce metadata shape on `vault_items` (partner, affiliate id,
  sponsored bool, disclosure copy).
- Category taxonomy for relevance-gating (which Task/goal categories map to which
  resource categories).
- Do resource suggestions ever appear *outside* a vault (e.g. inline on goal
  detail), or is the vault the only surface? Vault-only is the safer, less
  ad-like start.
