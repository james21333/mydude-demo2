# demo2 Master Prompt Reference

This file stores the user-provided master prompt/reference for **demo2.mydude.live**.

## Scope

- Active project: **demo2** only
- Treat demo2 as the only active project until the user explicitly says otherwise
- This file may be appended over time as additional prompt parts arrive
- Preserve prompt text verbatim in captured sections


---

## Part 1 received — 2026-05-20 06:42 PDT

```text
animation-engine — THREE PHASE PRODUCTION SYSTEM

PHASE 1 = AVATAR SYSTEM
PHASE 2 = BACKGROUNDS + OBJECTS + WORLD SYSTEM
PHASE 3 = MOVEMENT + ACTIONS + BEHAVIOR SYSTEM

==================================================
PHASE 1 — AVATAR SYSTEM
==================================================

You are building PHASE 1 of a complete production-grade procedural SVG/vector avatar generation engine for browser/client-side rendering.

The system must NOT generate raster images.

The system must generate deterministic structured JSON instructions that a browser renderer converts into SVG/vector graphics dynamically.

The visual style should resemble:

* Nintendo-like stylized visuals
* expressive cartoon proportions
* flat-shaded vector art
* readable silhouettes
* modular game-ready assets
* highly cohesive visual language
* clean outlines
* toy-like proportions
* simplified but expressive geometry

==================================================
FOUNDATIONAL ARCHITECTURE RULE
==============================

THIS ENTIRE ENGINE IS BASED ON STRICT COORDINATE DISCIPLINE.

Every single renderable entity in the system MUST obey:

* predefined coordinates
* predefined anchors
* predefined attachment zones
* predefined pivots
* predefined scaling behavior
* predefined transform inheritance
* predefined skeletal relationships

The AI must NEVER freestyle positioning.

The AI must NEVER “estimate” where body parts belong.

The AI must NEVER guess where limbs attach.

The AI must NEVER generate floating anatomy.

The AI must NEVER place components arbitrarily.

The browser/client is the authoritative coordinate system owner.

The browser/client owns:

* coordinate systems
* anchor systems
* skeletal systems
* attachment maps
* transform rules
* render rules
* pivot systems
* layering systems
* scaling systems
* depth systems
* animation systems

The AI ONLY:

* assembles
* selects
* configures
* transforms
* recolors
* composes

using STRICT predefined coordinate rules.

==================================================
CRITICAL STRICT COORDINATE SYSTEM
=================================

Every avatar MUST follow a strict coordinate framework.

This is MANDATORY.

The entire system depends on deterministic coordinate consistency.

Examples of REQUIRED behavior:

* arms ALWAYS connect to shoulder anchors
* elbows ALWAYS connect between upperArm and lowerArm
* hands ALWAYS attach to wrist anchors
* mouths ALWAYS align to facial anchors
* eyes ALWAYS align to eye sockets
* ears ALWAYS align to head anchors
* knees ALWAYS align to leg joints
* hats ALWAYS align to head anchors

Incorrect placements are forbidden.

Forbidden behavior includes:

* eyes floating outside head
* hands disconnected from arms
* mouths outside face
* accessories floating randomly
* legs attached to neck

The engine MUST enforce strict anatomical and structural consistency.

==================================================
CRITICAL LOCAL CHARACTER COORDINATE SYSTEM
==========================================

The engine MUST use LOCAL CHARACTER SPACE coordinates.

THIS IS ONE OF THE MOST IMPORTANT RULES IN THE ENTIRE SYSTEM.

Coordinates for avatar parts are NOT relative to:

* the screen
* the browser window
* the viewport
* world space
* camera position

Coordinates for avatar parts ARE ALWAYS relative to:

* the avatar root
* the avatar skeleton
* the avatar local coordinate system

Every character exists inside its own LOCAL CHARACTER SPACE.

The avatar is a self-contained coordinate universe.

==================================================
ABSOLUTE COORDINATE RELATIONSHIP RULE
=====================================

THIS RULE IS CRITICAL.

All coordinates are RELATIVE TO THE AVATAR ITSELF.

NOT relative to the screen.

NOT relative to camera position.

NOT relative to viewport placement.

NOT relative to browser position.

This means:
```
