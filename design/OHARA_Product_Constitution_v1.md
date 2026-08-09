# OHARA Product Constitution v1.0

Status: Foundational product and design authority
Source: `OHARA_Product_Constitution_v1.pdf`
Applies to: Product, design, engineering, content, and AI-assisted implementation

## Purpose

This Constitution is the single source of truth for the OHARA product experience. It defines the philosophy, principles, and design intent that guide every future interface decision. It governs presentation and experience, not business logic.

Every designer, engineer, and AI coding assistant must understand this document before modifying the product.

## Product Manifesto

OHARA is a personal growth companion that helps people understand who they are becoming through intentional action, meaningful reflection, and measurable progress.

People change every day, yet few people ever see that change clearly. Memories fade, emotions distort perspective, and achievements quickly become routine. OHARA exists to preserve understanding.

By connecting goals, reflection, and measurable progress into a single experience, OHARA helps people develop an objective understanding of themselves over time.

## What OHARA Is

OHARA is not another goal app, AI chatbot, or digital journal.

OHARA is a reflective operating system for personal growth. It combines personal reflection with measurable progress to create insights that cannot be found through isolated notes or disconnected trackers.

## Emotional Outcomes

Every interaction should leave users feeling:

- **Capable:** I know what to do next.
- **Understood:** I understand myself more clearly.
- **Intentional:** My actions align with who I want to become.

These outcomes are product requirements. A visually polished interface that leaves the user confused, judged, or distracted is not successful.

## Core Principles

### Reflection over productivity

The product should help people interpret their actions, not merely complete more tasks. Completion is evidence; understanding is the outcome.

### Clarity over decoration

Visual choices must strengthen hierarchy, comprehension, and calm. Decoration is justified only when it improves meaning, orientation, or emotional resonance.

### Progress should be understood, never judged

Progress language and visualization must be descriptive, humane, and contextual. Avoid shame, alarmism, artificial urgency, and simplistic success/failure framing.

### Growth is not linear

The interface must support pauses, setbacks, restarts, reflection, and changing direction. It should reveal patterns without implying that a person's development is a straight line.

### Beauty encourages consistency

Craft is functional. A calm, thoughtful, premium experience can make returning to reflection feel inviting and sustainable.

### Technology should disappear during reflection

During reflective moments, controls, system language, and AI mechanics should recede. The user's thoughts and history should remain central.

## Experience Philosophy

Using OHARA should feel like sitting down with a cup of coffee and opening a green glass journal.

The home experience is a **Reflective Dashboard** that answers:

1. Where should I focus today?
2. What does today mean?
3. How am I becoming the person I want to be?

Features should be discovered gradually, just as understanding oneself takes time. Progressive disclosure is preferred over exposing every capability at once.

## AI Philosophy

Echo is not a chatbot. Echo is a thoughtful mirror.

Its purpose is to:

- summarize;
- listen;
- recommend;
- surface meaningful insights from the user's own history.

AI should help users reflect **with AI**, not simply talk **to AI**.

AI output must remain grounded in the user's own material, distinguish observation from inference, avoid judgment, and make the next reflective action clear. The interface should not foreground models, prompts, or system mechanics unless operationally necessary.

## Visual Philosophy

OHARA's visual identity should be calm, modern, and premium. The interface should combine Apple's polish, Notion's organization, and OHARA's own identity.

Signature elements include:

- restrained green accents;
- elegant typography;
- glassmorphism;
- generous whitespace;
- subtle gradients;
- storytelling analytics.

These are means, not goals. Each element must support clarity, reflection, or continuity. Glass and gradients must remain subtle, accessible, and performant.

## Component Philosophy

Cards are beautiful entry points into deeper workspaces.

Every feature should share a consistent layout while preserving its own signature interaction. Shared structure should make the product predictable; feature identity should make each workspace meaningful.

Remove heavy borders and unnecessary badges. Prefer:

- hierarchy over framing;
- typography over labels;
- spacing over separators;
- elevation over visual clutter;
- progressive disclosure over dense control surfaces.

## Engineering Constitution

### Never change without explicit approval

- Business logic
- APIs and data contracts
- Routing
- Authentication
- Feature names
- Logos and brand marks
- User workflows

### Always improve

- Consistency
- Accessibility
- Typography
- Spacing
- Hierarchy
- Responsiveness
- Shared components

Codex should behave like a senior Apple engineer and a teammate who never assumes. When the correct product behavior is unclear, preserve the existing behavior and surface the decision instead of inventing a new one.

## Decision Test

Before approving a product or interface change, ask:

1. Does it preserve the user's workflow and existing capabilities?
2. Does it make the user's current context easier to understand?
3. Does it help the user see progress without feeling judged?
4. Does it reduce distraction during reflection?
5. Does it feel calm, intentional, and distinctly OHARA?
6. Is it accessible and responsive?
7. Does it use or strengthen shared patterns?

If the answer to the first question is no, explicit approval is required. If the remaining answers are mostly no, the change does not belong in OHARA.

## Definition of Done

A successful implementation preserves every feature while making the product feel calmer, clearer, more intentional, and more premium.

Every screen should reinforce understanding, not productivity alone. If a change does not help users understand who they are becoming, it does not belong in OHARA.

An interface change is complete only when:

- existing functionality and workflow are preserved;
- hierarchy and next action are clear;
- empty, loading, error, success, disabled, focus, hover, and pressed states are coherent;
- keyboard, screen-reader, contrast, and touch-target requirements are met;
- responsive behavior is verified at supported widths;
- light, dark, focused, public, Echo, and Constellation contexts remain intentional;
- duplicated patterns are consolidated when safely in scope;
- visual regression and functional verification show no unintended change.

## Authority and Versioning

This is Version 1 of the OHARA Product Constitution. It establishes the product philosophy that governs the OHARA Design System, component library, engineering standards, and Codex implementation documents.

When documents conflict, use this precedence:

1. Explicit product-owner direction for the current task.
2. This Product Constitution.
3. Approved workflow, accessibility, security, and data constraints.
4. The OHARA Design System.
5. UI modernization and implementation specifications.
6. Existing visual implementation.

Changes to this Constitution require explicit product approval and a new version note.
