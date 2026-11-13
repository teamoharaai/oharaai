# OHARA — Landing Page V2.0
## Design & Content Specification

**Status:** Final content approved by the October 14, 2026 user overrides; local landing-page implementation authorized. Deployment requires a separate release instruction.
**Scope:** Public-facing landing page, desktop-first and responsive
**Owner:** OHARA product/design team
**Version:** 2.0 · October 2026
**Source:** User-approved visual references and final decisions, not a live-code audit

## 1. Purpose and constraints

**Final visual/copy overrides (October 14, latest review):** The approved hero layout, typography, content width, and navigation remain unchanged; refine only its layered forest/emerald CSS gradient. Remove both botanical panels from Understand Yourself and use a distinct forest-green gradient with an editorial two-column layout retaining all existing copy and functionality. Use that same gradient for the closing invitation, replacing its texture entirely. Site wordmarks, footer branding, and page metadata use **OharaAI**; approved product names and the OHARA team story otherwise remain intact. Replace the team's final sentence with: “We're excited to see how OHARA will evolve, and we're grateful to have you be part of that journey.” These decisions supersede any earlier artwork, texture, or wording requirements below. All refinements remain local and uncommitted until separately authorized.

**Final alignment override (October 14):** Keep example cards and overlapping artwork panels upright. Do not apply decorative card rotations.

**Latest palette override (October 14):** Light sections should be white rather than cream and mostly follow the current site's palette. Reuse `LIGHT_THEME` from `constants/colors.ts`: page `#F8F8F6`, cards `#FFFFFF`, subtle `#F5F6F3`, sidebar `#F1F3EF`, text `#1C1C1E` / `#6E6E73`, dividers `#E5E5EA`, and OHARA green `#63C174`. Preserve the approved forest-green gradient hero and dark green feature sections. References to cream/ivory below describe the original art direction only and are superseded for UI surfaces; existing botanical artwork may retain its source colors.

Build a distinctive, editorial, luxurious, modern landing page that communicates OHARA as a **personal growth companion**, not a corporate task manager or generic AI chatbot. The page should help visitors immediately understand what OHARA is, why it exists, what works today, and what is coming next. The user's final content and design overrides supersede the earlier design-only handoff. This document defines the local implementation requirements; it does not authorize deployment.

The selected visual reference is the previously approved, long-form OHARA mockup featuring: a silk-like deep green gradient hero without imagery; cream product-preview sections; a dark green self-awareness section with two overlapping botanical/leaf-vein graphics; a cream goals-and-momentum section; and a dark architectural-texture closing section. Treat this image as a compositional guide, not pixel-perfect production artwork or a source of product truth.

### Non-negotiables

- **Hero:** dark, silky, layered green gradient. **No laptop, phone, product screenshot, scenic nature photo, or AI-generated tree in the first viewport.**
- **Branding:** existing authentic OHARA logo and icon assets, never generated substitute logos.
- **Top navigation:** **Product · About Us · Coming Soon**, with same-page anchor scrolling; a separate **Get Started** CTA may remain at right.
- **Primary CTA copy:** **Get Started**. Route to the actual existing onboarding/signup entry point determined from the repository; do not invent a URL or enrollment claim.
- **Visual style:** forest green / brand green, cream, warm off-white, elegant serif headlines used selectively, highly legible sans-serif body/interface text, ample breathing room, restrained shadows.
- **Trust claims:** no fictitious testimonials, star ratings, user counts, demographic claims, fabricated app usage data, or unnamed product endorsements.
- **Community:** Circles/community is planned for later. Do not depict it as a currently functioning social feed.
- **Coming Soon:** AI analysis/insights should lead; OHARA Athlete is a **concept under consideration**, not a confirmed shipping product or timeline.
- **Asset integrity:** use the user's inspiration board for art direction, but obtain original artwork/photos and usage rights before publishing. Do not ask an image generator to recreate the referenced photographs as if they are genuine originals.
- **Functionality:** market only what the current repository actually supports. Future items must be labeled accurately.

## 2. Messaging architecture

### Core three brand statements

1. **A More Intentional Way to Grow** — the final approved main hero headline.
2. **Own Your Personal Growth** — user agency, achievable goals, reflection, and progress. Replaces the earlier phrase “Fortify Your Personal Growth.”
3. **Find Strength in Connection** — human connection and community; if tied to Circles, label the capability **Coming Soon**.

Do not substitute “Turn reflection into real progress” as the primary headline. This former mockup text is not approved as the hero caption.

### Hero copy — final approved headline

**Eyebrow:** A PERSONAL GROWTH COMPANION
**Final headline:** **A More Intentional Way to Grow**
**Suggested support text:** *Bring your goals, actions, and reflections together in one place. Understand your progress, make choices that matter, and grow on your own terms.*
**CTA:** Get Started

The final October 14 overrides approve this exact headline and casing. It is no longer a pending copy decision.

### Writing standards

Use a calm, confident, personal voice. Avoid guilt, pressure, artificial urgency, gamification, grandiose promises, and generic AI hype. The visitor should perceive autonomy rather than being pushed or evaluated. Prefer brief, concrete descriptions to vague “AI will transform everything” language. Do not promise personalized LLM insights before implementation.

## 3. Information architecture and page flow

### A. Global header and navigation

- Real OHARA logo/wordmark on the left, linked to page top.
- Three centered anchors: **Product**, **About Us**, **Coming Soon**.
- Right-aligned **Get Started** action using the existing product's verified signup path.
- Minimal transparent or dark-green-integrated appearance over hero; transition to an accessible sticky treatment if appropriate when scrolling.
- Desktop: elegant, lightly spaced text. Mobile: accessible menu/disclosure, proper focus management, no hidden essential links.
- Navigation anchor targets: `#product`, `#about`, and `#coming-soon` (proposed IDs; reconcile with existing route structure).

### B. Section 1 — Hero / first impression

**Visual:** Full-bleed deep forest-green silk-like gradient, with subtle tonal variation and soft gradients only; no photographic subjects or devices. Typographic composition approximately follows the preferred reference: generous negative space; left-aligned editorial headline; understated vertical microcopy such as “REFLECT · PLAN · ACT · GROW” at right if it improves balance.

**Copy:** Final approved hero headline **A More Intentional Way to Grow**; keep the primary CTA **Get Started**. Omit “Watch Demo” unless a genuine usable demo exists. Omit testimonial avatars, ratings, or “trusted by” wording without verified evidence.

**Motion:** Very gentle, performance-conscious gradient movement optional; respect `prefers-reduced-motion`. Avoid hover-only dependencies or aggressive parallax.

### C. Section 2 — Product / tangible app preview (`#product`)

**Working title:** *A focused space for a more intentional you.*
Keep the approved hero statement as the main identity marker; no competing primary slogan is required.

Light cream background. Large product workspace preview beneath minimal introductory copy. The preview should communicate a calm, connected product with the verified, real OHARA structure—Home / Goals / Projects / Notes / Journal / Momentum, with Sources in the relevant libraries and Vaults. Use authentic UI screenshots or a carefully reproduced, visually representative demo based on current production components; no fictional capabilities or metrics. The reference UI's white floating cards, slight depth, subtle dividers, and left sidebar can inform the final app design, but this landing-page effort does not authorize app-wide redesign.

### D. Section 3 — Self-understanding / Notes & Journal

**Working title:** *Understand yourself on a deeper level.*

Deep evergreen section. Pair a restrained explanation of reflection, connected goals, and personal learning with the **actual botanical/leaf-vein artwork** from the inspiration board. Use overlapping dark-on-light leaf-vein visual panels as in the preferred mockup, preferably sourced from original licensed assets and not AI-generated facsimiles. The main message should stress self-awareness and personal meaning; do not imply unreleased AI reasoning features are available. A CTA can lead to the existing onboarding route. Echo must not be presented as the former Notes/Reflection feature.

Possible supported microcopy: *Your thoughts and actions are part of a larger story. OHARA gives them room to connect.* Treat this as proposed copy.

### E. Section 4 — Goals, Projects and Momentum

**Anchor message:** *Own Your Personal Growth.*

Warm cream/stone background, left-side restrained text and short capabilities, right-side realistic goal/workspace card. Emphasize a goal moving through clear action, milestones, and progress. Feature labels should use actual shipped product names and interactions. Visualize progress in the style of the reference (a few clean progress rows and a subtle green graph). Avoid implying automatic AI summaries unless available.

The visual objective is to make the product feel trustworthy and usable without making OHARA look like Jira. Keep the cards elegant and simplified.

### F. Section 5 — Connection / community preview

**Anchor message:** *Find Strength in Connection.*
**Status:** COMING SOON

Introduce OHARA's philosophy that growth can be supported through human connection. Circles and social-community features must be described as **planned**, not launched. This can be an editorial statement or a discreet concept illustration, but **not an authentic-looking feed with invented users, comments, or live social signals**. The section may include a subtle “Explore what’s ahead” anchor to Coming Soon rather than a nonfunctional Join Community button.

### G. Section 6 — About Us / mission (`#about`)

**Replaces the entire testimonials / reviews section.** No stock headshots, fictional quotations, five-star ratings, or “trusted by” language.

Use the following approved copy verbatim. Present the team story in an elegant editorial layout, with a comfortable reading width and generous spacing. The closing signature is personal and understated.

#### Our Product

OHARA is a personal growth companion designed to bring your goals, actions, and reflections together in one place. We believe personal growth isn't just about what you accomplish, but what you learn about yourself along the way. Our goal is to give you the tools and clarity to grow with intention, at your own pace.

#### Our Team

OHARA began with four longtime friends, fresh out of college, who shared a simple idea: to create something meaningful and genuinely useful. Coming from backgrounds in engineering and science, we've always valued learning, organization, and the importance of building healthy habits.

As artificial intelligence became a bigger part of everyday life, we wanted to approach it a little differently. We believe technology should help people understand themselves, not take away from the effort and experiences that make personal growth meaningful.

Our hope is that OHARA becomes more than just another app. We want it to be a space where you can organize your ideas, work toward your goals, reflect on your experiences, and discover more about yourself along the way.

Most importantly, we're building OHARA with the understanding that we're growing and learning, too. We're excited to see what this becomes, and we're grateful to have you be part of that journey.

*Thank you,*
**The OHARA Team**

### H. Section 7 — Coming Soon (`#coming-soon`)

**Priority 1: OHARA Intelligence — Upcoming AI-powered analysis, personalized insights, and pattern recognition.**
Explain the intended direction: connecting user-authorized goals, activity, and reflections to generate meaningful summaries and insights in future releases. Clearly distinguish current non-LLM metrics from planned AI-generated analysis; don't claim features are already delivered if not verified. Do not imply access to private data without consent.

**Priority 2: OHARA Athlete — A future product concept involving fitness and personal development.**
Present as an exploratory idea for a more fitness-oriented companion experience, potentially incorporating training, goals, and wellness context subject to product decisions and integrations. Label clearly: **Concept · Under exploration**. Do not promise Apple Health/Watch sync, dates, pricing, clinical claims, or product availability without approval.

Both should be visually premium but distinctly speculative. No launch countdowns unless a date is actually confirmed.

### I. Section 8 — Final invitation / footer

Use the approved dark architectural wood-rib/organic texture direction from the moodboard, subject to licensed originals, with accessible contrast. Short identity-based closing statement and single clear **Get Started** CTA. Avoid duplicate or misleading claims such as “no credit card required” unless independently confirmed. Footer includes real existing privacy/terms/contact or social links only where available.

## 4. Visual system (directional; actual token values from repository)

- **Primary:** Existing OHARA green and its darker forest variations; inspect and reuse established theme tokens. Do not introduce inconsistent sage or luminous green shades.
- **Neutral surfaces:** cream / warm ivory for storytelling, true white or subtly tinted cards, near-black or deep forest for high-contrast content.
- **Type:** expressive editorial serif for hero and key brand statements, clean contemporary sans-serif for body, navigation, UI labels and card content. Select fonts and weights according to licensing and real performance constraints.
- **Cards:** carefully limited radius, fine borders and ambient shadows; more whitespace than dashboard density; no glassmorphism as a default.
- **Graphics:** authentic leaf-vein artwork and architectural wood textures. Don't generate generic fantasy trees. Retain imagery provenance in an asset manifest.
- **Motion:** deliberate fade/translate reveals, slight hover response, gentle gradient drift only where it adds value. Reduced-motion fallback and no animation dependence for understanding.
- **Charts and previews:** high legibility, minimal labels/grids, restrained green use, authentic or clearly illustrative sample data, avoiding fabricated customer metrics.
- **Responsive:** mobile-first checks despite desktop reference: preserve reading order, legible typography, no clipped imagery, accessible CTA placement, and performant image cropping.

## 5. Components and interaction requirements

- Header anchors scroll to correct sections and work with keyboard navigation.
- Sticky navigation must not cover anchor headings. Use suitable scroll-margin offsets.
- Main CTA must route to existing validated signup/login entry point, determined in a later repository audit.
- Product preview is visually useful even when no interaction is offered; never present a fake clickable demo.
- AI and Athlete Coming Soon cards are unmistakably not yet released.
- No automatic carousel requirement. If motion or rotating previews are added later, include pause/reduced-motion controls.
- Page meets reasonable keyboard, focus visibility, semantic structure, accessible contrast, alt text, and image-loading practices.
- Respect production performance budgets, image optimization, semantic HTML, and SEO title/description/social previews during implementation.

## 6. Asset and fidelity rules

1. Obtain official OHARA logos from existing project assets; never redraw from generated mockups.
2. Place reference screenshots/board and any licensed source graphics in a design reference directory before implementation. The attached moodboard is inspiration, **not automatically a publishing license**.
3. Use existing site screenshots or generated **demo-only representations** clearly reviewed for feature accuracy. Prefer actual screenshots of working UI.
4. Never publish AI-generated testimonial people, fake ratings, usage counts, or invented product screenshots disguised as live functionality.
5. Preserve the visual geometry of the approved mockup where possible: gradient hero; generous cream product space; green reflection/leaf composition; cream goal feature section; mission replacing reviews; Coming Soon preview; dark textured final CTA.
6. The reference graphic and production UI will differ; do not overwrite existing product design with mockup assumptions.

## 7. Explicitly pending approvals

- **Resolved:** The final hero headline is **A More Intentional Way to Grow**. The approved supporting statements are **Own Your Personal Growth** and **Find Strength in Connection**.
- Real asset inventory and licensing: official wordmark variants, original leaf-vein textures, wood-rib photography, and any other production-ready imagery.
- Reality audit for product screens and claims: which features, graphs, insights, and data are available today.
- Verification of actual Get Started destination and whether separate demo footage exists.
- **Resolved:** OHARA Intelligence is upcoming AI analysis, personalized insights, and pattern recognition. OHARA Athlete is a future concept involving fitness and personal development. Circles/community is planned for the future.
- Accessibility and responsive behaviors to be tested during implementation planning.

## 8. Implementation handoff — final user overrides

The October 14 user request authorizes incorporating these decisions into the repository design document and implementing the public landing page locally. Inspect actual routes, tokens, and assets first. Keep the landing-page build separate from authenticated workspace UI. Do not deploy without a separate release instruction.

## 9. Acceptance criteria for design approval

- First viewport is silk-like green gradient and typography, with no laptop or nature scene.
- Official logo used and header only offers Product, About Us, Coming Soon plus optional CTA.
- "Get Started" is the primary action and uses a verified real route once built.
- "A More Intentional Way to Grow," "Own Your Personal Growth," and "Find Strength in Connection" have their approved roles.
- UI previews reflect authentic capabilities, not simply a generated dashboard aesthetic.
- Reflection section uses original botanical artwork direction, avoiding synthetic fantasy-tree style.
- Reviews/testimonials are replaced by a clear mission section; no invented endorsements.
- Circles is presented as future; upcoming AI analysis appears first and Athlete is clearly an exploratory concept.
- Layout works on desktop and mobile, and visuals remain readable in reduced motion and accessibility settings.

## 10. Local implementation and asset manifest — October 14, 2026

- Web implementation: `components/landing/LandingPage.web.tsx` and scoped `landing-v2.css`. Native and authenticated workspace layouts remain unchanged.
- Verified Get Started route: `/signup`, implemented by `app/(auth)/signup.tsx`. Header links are only Product, About Us, and Coming Soon, all same-page anchors, plus the approved Get Started action.
- Brand mark: existing `assets/brand/ohara-logo.png`. Feature icons reuse `components/ui/BrandIcon.tsx`; no replacement logos were generated.
- Existing botanical artwork: `assets/brand/artwork/ohara-vein-dark.png` and `ohara-vein-light.png`; closing texture: `ohara-woodgrain.png`. These were already repository assets used by the public page. No new license or original photographic provenance is asserted; retain the prepublication rights check if provenance is not recorded elsewhere.
- Hero: CSS gradients only. No image, product preview, or photograph appears in the hero.
- Typography: existing Inter and Lora font families. No new font dependency.
- Product previews are explicitly labeled illustrative sample content, with no claimed customer metrics or functioning demo controls.
- Reference: the user-supplied long-form mockup remains the compositional reference, with final overrides taking precedence over its outdated headlines, navigation, testimonials, ratings, and AI claims. The reference itself is not published as an asset.
- Additional reference reviewed: `oharadesignpreview(w).pdf` (nine pages, supplied October 14). Page 1 provides the botanical panels and wood/architectural moodboard; pages 2–5 show official mark variations; pages 6–9 show woodgrain, branch, and leaf-vein compositions. These confirm the existing repository artwork direction. Older slogans in the PDF remain superseded by the final content overrides. The PDF is a design reference, not a new publishing-license assertion.
- All original responsive, accessibility, reduced-motion, asset-integrity, and performance requirements above remain applicable.

## 11. Local validation — October 14, 2026

- Browser checks: both Playwright tests passed. Verified desktop copy, section anchors/focus, actual signup routing, mobile navigation and Escape, direct hash links, reduced-motion behavior, and no horizontal overflow at 320/390/768px.
- Visual checkpoints: `docs/ui-checkpoints/landing-v2/` contains full-page desktop/mobile captures and full-size hero captures.
- Production web export: passed with isolated preview configuration. No production secrets or data were used for landing-page validation.
- Tracked TypeScript: only the previously documented `lib/goals/manual-create-v1.test.ts` URL-type mismatch remains; no new landing-page diagnostics.
- No migration or production deployment is part of this local implementation.
