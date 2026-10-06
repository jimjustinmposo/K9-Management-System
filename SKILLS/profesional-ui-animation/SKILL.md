# Professional UI Animation Skill

## Purpose

Apply polished, professional animation and motion to web applications without changing existing functionality or making the interface look like a generic AI-generated template.

The goal is:

- Premium
- Modern
- Smooth
- Subtle
- Fast
- Responsive
- Professional
- Purposeful

Animation must improve usability and perceived quality, not simply add movement.

---

## Before Making Changes

Always inspect the existing application first.

1. Identify the framework.
2. Identify the styling system.
3. Inspect existing components.
4. Check whether an animation library already exists.
5. Check existing transitions and animation utilities.
6. Reuse the existing design system.
7. Do not introduce a new animation library unless there is a clear benefit.
8. Do not rewrite unrelated components.

Never assume the project structure.

---

## Core Animation Principles

Follow these principles:

### Subtle

Prefer small movements:

- 1–4px translation
- 0.98–1.02 scale
- subtle opacity changes
- subtle shadow changes

Avoid dramatic movement.

### Fast

Recommended durations:

- Instant: 100ms
- Fast: 150ms
- Normal: 200ms
- Medium: 300ms
- Maximum normally: 400ms

Avoid animations longer than 500ms unless there is a specific UX reason.

### Purposeful

Every animation should communicate something:

- entering
- leaving
- loading
- changing state
- confirming an action
- highlighting interaction
- improving navigation

If an animation does not improve the UX, don't add it.

---

# Page and Content Animation

Use subtle entrance animations for page content.

Preferred pattern:

- opacity: 0 → 1
- translateY: 8px → 0

Duration:

- 200–350ms

Avoid dramatic page zooms or large movement.

---

# Cards

Cards may use subtle hover feedback.

Recommended:

- translateY: -1px to -3px
- subtle shadow increase
- smooth transition

Duration:

150–250ms.

Do not make cards bounce or move significantly.

---

# Buttons

Buttons should provide immediate interaction feedback.

Use:

- hover transition
- subtle elevation
- slight brightness change
- optional scale around 1.01
- active/pressed feedback
- disabled state transition

Avoid large scale effects.

---

# Navigation

Animate:

- sidebar expansion/collapse
- mobile menus
- active navigation indicators
- dropdowns
- menu icons

Use smooth transitions rather than abrupt state changes.

Navigation animation should remain fast and unobtrusive.

---

# Modals and Dialogs

Use:

1. Overlay fade-in.
2. Dialog fade-in.
3. Small scale or vertical movement.

Example:

```text
opacity: 0 → 1
scale: 0.98 → 1
```

Duration:

200–250ms.

Closing animation should reverse smoothly.

Avoid excessive bounce effects.

---

# Dropdowns

Dropdowns should:

- fade in
- move slightly
- use approximately 150–200ms
- close smoothly

Do not use large movement.

---

# Toast Notifications

Toast notifications should:

- enter with fade + small slide
- remain stable while visible
- exit smoothly

Use animation to communicate state, not to attract unnecessary attention.

---

# Loading States

Prefer:

- skeleton loading
- subtle shimmer
- lightweight spinners

Avoid flashing content.

When loading finishes, transition smoothly into the actual content.

---

# Forms

Use subtle animation for:

- input focus
- validation
- errors
- success states
- checkbox selection
- toggle switches
- expanding form sections

Do not use aggressive shaking for validation errors.

---

# Tables and Lists

For small dynamic lists:

- animate new items
- animate removed items
- use subtle staggered entrance when appropriate

For large tables or datasets:

**Prioritize performance over animation.**

Do not animate hundreds of elements simultaneously.

---

# Dashboard and Charts

Use animation for:

- initial chart appearance
- meaningful data changes
- number counters when useful

Avoid repeatedly animating charts on every render.

---

# Microinteractions

Add subtle feedback for actions such as:

- Copy → Copied
- Save → Saving → Saved
- Upload → Uploading → Complete
- Delete → Confirmation
- Refresh
- Toggle
- Favorite
- Bookmark
- Success/error states

Animations should make state changes obvious.

---

# Motion and Easing

Prefer:

- `ease-out` for entering
- `ease-in` for exiting
- `ease-in-out` for state transitions

Use consistent easing throughout the application.

Avoid excessive:

- bounce
- elastic effects
- spring effects
- spinning
- floating
- exaggerated zoom

unless the product specifically requires that style.

---

# Performance

Prefer GPU-friendly properties:

- `transform`
- `opacity`

Avoid unnecessarily animating expensive properties.

Do not create animations that cause layout thrashing.

Avoid JavaScript animation when CSS transitions are sufficient.

For React applications, avoid animation logic that causes unnecessary component rerenders.

---

# Accessibility

Always support:

```css
@media (prefers-reduced-motion: reduce)
```

Users who prefer reduced motion should receive minimal or no non-essential animations.

Never make important information dependent on animation.

---

# Responsive Design

Animations must work on:

- desktop
- tablet
- mobile

Consider reducing expensive animations on smaller or lower-powered devices.

Touch interfaces should not depend on hover animations.

---

# Visual Consistency

Use a consistent motion system across the application.

Do not randomly give every component a different animation.

Prefer reusable animation utilities/components when the project architecture supports them.

Examples:

```text
fade-in
slide-up
scale-in
modal-enter
dropdown-enter
toast-enter
skeleton
```

Reuse existing utilities before creating new ones.

---

# Do Not Redesign

When applying this skill:

DO NOT:

- change business logic
- change database structure
- change API behavior
- redesign the application's layout
- replace the existing color system
- replace the existing typography
- replace existing components unnecessarily
- add random gradients
- add excessive shadows
- add unnecessary animations
- rewrite large sections of the application

Animation should enhance the existing design.

---

# Professional Quality Standard

The application should feel like a polished production SaaS product.

Target characteristics:

- restrained
- smooth
- responsive
- elegant
- modern
- fast
- consistent

Avoid the appearance of:

- generic AI-generated UI
- template websites
- excessive motion
- gaming interfaces
- cartoon animations
- demo/prototype interfaces

The user should notice that the application feels smoother, not notice individual animations everywhere.

---

# Implementation Workflow

When asked to add animation:

### Step 1 — Inspect

Inspect:

- project structure
- package.json
- styling system
- existing components
- existing animation utilities
- existing design system

### Step 2 — Plan

Identify the highest-value areas for animation.

Prioritize:

1. navigation
2. page transitions
3. buttons
4. cards
5. modals
6. forms
7. loading states
8. notifications
9. data interactions

Do not animate everything automatically.

### Step 3 — Implement

Make small, focused changes.

Reuse existing architecture.

Prefer CSS transitions for simple interactions.

Use existing animation libraries when already installed.

### Step 4 — Verify

After implementation:

- run lint
- run type checking
- run tests if available
- run production build
- check console errors
- check desktop
- check mobile
- check reduced-motion behavior

### Step 5 — Final Review

Ask:

> Does this animation improve the user experience?

If the answer is no, remove it.

---

## Critical Rule

**Professional animation is restrained animation.**

Do not animate an element simply because it can be animated.

The final application should feel:

**smooth → responsive → premium → professional**

rather than:

**busy → flashy → distracting → slow**