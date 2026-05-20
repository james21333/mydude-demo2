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

---

## Part 2 received — 2026-05-20 06:42 PDT

```text
* the left hand ALWAYS attaches to the same wrist anchor
* the wrist ALWAYS attaches to the same lowerArm anchor
* the lowerArm ALWAYS attaches to the same elbow anchor
* the elbow ALWAYS attaches to the same upperArm anchor
* the upperArm ALWAYS attaches to the same shoulder anchor

The relationship NEVER changes regardless of:

* screen location
* camera movement
* world movement
* scene position
* scaling
* depth
* directional state

If the avatar walks across the screen:

* the internal skeleton remains IDENTICAL
* the anatomical relationships remain IDENTICAL
* the local coordinate system remains IDENTICAL

The ENTIRE avatar moves as ONE assembled structure.

The renderer first builds the avatar in LOCAL CHARACTER SPACE.

ONLY AFTER assembly does the renderer:

* place the avatar into world space
* apply camera transforms
* apply depth transforms
* apply scaling transforms
* render onto screen

This guarantees:

* anatomical consistency
* deterministic attachments
* reusable animations
* coordinate-safe rendering
* stable skeleton behavior
* modular body systems
* reusable directional systems

==================================================
LOCAL CHARACTER SPACE
=====================

Each avatar has:

* a root transform
* a local coordinate origin
* a local skeleton
* local anchors
* local body regions
* local attachment points

The ENTIRE avatar is built relative to its own origin point.

Example:

* avatarRoot = (0,0)
* headAnchor = (0,-120)
* leftShoulder = (-42,-65)
* rightShoulder = (42,-65)
* pelvis = (0,25)

These coordinates NEVER depend on screen position.

==================================================
HIERARCHICAL TRANSFORM SYSTEM
=============================

The system MUST use hierarchical transforms.

Each body part attaches to a parent body part.

Example hierarchy:

avatarRoot
→ pelvis
→ spine
→ chest
→ shoulders
→ upperArms
→ lowerArms
→ hands

And:

pelvis
→ upperLegs
→ lowerLegs
→ feet

Every child part inherits transforms from parent parts.

This is MANDATORY.

==================================================
ABSOLUTE SCREEN COORDINATES ARE FORBIDDEN
=========================================

The AI must NEVER place anatomy using screen coordinates.

WRONG:

* place hand at screen x=400 y=220

CORRECT:

* place hand at local wrist anchor relative to lowerArm

==================================================
TWO-LAYER COORDINATE SYSTEM
===========================

The engine MUST separate coordinates into TWO systems:

1. LOCAL CHARACTER SPACE
2. WORLD/SCREEN SPACE

==================================================
1. LOCAL CHARACTER SPACE
========================

Used for:

* skeletons
* limbs
* facial features
* accessories
* body parts
* internal transforms
* attachment systems
* anatomical structure

This NEVER changes relative to the avatar itself.

==================================================
2. WORLD / SCREEN SPACE
=======================

Used for:

* avatar placement in world
* camera movement
* scene positioning
* rendering
* depth transforms
* distance scaling

This affects the ENTIRE assembled avatar equally.

==================================================
NINTENDO-STYLE MODULAR CHARACTER PRINCIPLE
==========================================

Nintendo-style characters work because:

* body parts are modular
* proportions are controlled
* anchors are consistent
* attachment points never change
* skeletons are deterministic
* every direction uses predictable transforms

This engine MUST follow the same philosophy.

==================================================
STRICT ANCHOR CONSISTENCY
=========================

Every body part MUST attach using FIXED anchor definitions.

The renderer connects anchors directly.

NEVER by estimation.

NEVER by AI interpretation.

==================================================
ALL PARTS REQUIRE LOCAL PIVOTS
==============================

Every component MUST define:

* localOrigin
* localPivot
* attachmentAnchors
* boundingBox
* localDepth
* transformInheritance==================================================
UNIVERSAL ANCHOR SYSTEM
=======================

Every avatar component attaches ONLY through anchors.

NO FREE POSITIONING ALLOWED.

Every anchor has:

* exact local coordinates
* parent relationships
* transform inheritance
* scaling inheritance
* rotation inheritance
* depth inheritance
* attachment constraints

==================================================
MANDATORY HUMANOID SKELETON
===========================

All humanoid avatars MUST use:

* root
* pelvis
* spineLower
* spineUpper
* chest
* neck
* head
* leftShoulder
* rightShoulder
* leftUpperArm
* rightUpperArm
* leftElbow
* rightElbow
* leftWrist
* rightWrist
* leftHand
* rightHand
* leftHip
* rightHip
* leftKnee
* rightKnee
* leftAnkle
* rightAnkle
* leftFoot
* rightFoot
* leftEye
* rightEye
* mouth
* nose
* leftEar
* rightEar
* hatAnchor
* backpackAnchor
* weaponAnchor
* capeAnchor

Each anchor has FIXED relative coordinates.

==================================================
MANDATORY CREATURE SKELETON RULES
=================================

Creature skeletons MUST ALSO obey strict coordinate systems.

Quadrupeds MUST define:

* spineFront
* spineMiddle
* spineRear
* neck
* head
* jaw
* frontLeftShoulder
* frontRightShoulder
* rearLeftHip
* rearRightHip
* frontLeftKnee
* frontRightKnee
* rearLeftKnee
* rearRightKnee
* frontLeftFoot
* frontRightFoot
* rearLeftFoot
* rearRightFoot
* tailBase
* tailMid
* tailTip

Feet MUST ONLY attach to valid foot anchors.

==================================================
STRICT BODY REGION ZONES
========================

Every avatar must define protected anatomical regions.

Examples:

* head zone
* face zone
* torso zone
* pelvis zone
* arm zone
* leg zone
* foot zone

Examples of allowed rules:

* eyes ONLY allowed in face zone
* mouths ONLY allowed in face zone
* hats ONLY allowed in head zone

==================================================
STRICT COMPONENT DEFINITION REQUIREMENTS
========================================

Every component MUST define:

* componentId
* componentCategory
* width
* height
* localOrigin
* boundingBox
* pivotPoint
* validAttachmentAnchors
* validZones
* validDirectionalStates
* validScaleRange
* validRotationRange
* compatibleSkeletonTypes

==================================================
MULTI-DIRECTIONAL CHARACTER REQUIREMENTS
========================================

Every avatar MUST support:

1. Front
2. Front-Left
3. Left
4. Back-Left
5. Back
6. Back-Right
7. Right
8. Front-Right

Each direction has:

* unique coordinate maps
* unique anchor maps
* unique attachment maps
* unique layering rules
* unique perspective transforms

Directional systems are PREDEFINED client-side.

==================================================
STRICT DIRECTIONAL ANATOMY RULES
================================

Each directional view must preserve:

* anatomical consistency
* joint continuity
* attachment continuity
* silhouette integrity
* skeletal correctness

==================================================
RUNTIME VALIDATION SYSTEM
=========================

The client MUST validate ALL AI output.

Validation rules reject:

* invalid anchors
* invalid coordinates
* invalid anatomy
* floating limbs
* disconnected skeletons
* overlapping forbidden regions

The renderer must NEVER render invalid anatomy.

==================================================
STRICT JSON OUTPUT RULES
========================

The AI must:

* return JSON only
* return deterministic output
* never return prose
* never return markdown
* never invent coordinates
* never invent anchors
* never invent components
* never invent transforms

The AI must ONLY:

* assemble valid predefined components
* apply valid transforms
* obey strict coordinate systems
* obey anatomical constraints

==================================================
FULL RENDERING KNOWLEDGE PACKAGE
================================

The client MUST ALWAYS send:* coordinate systems
* skeleton maps
* anchor maps
* attachment rules
* directional coordinate rules
* valid zones
* transform constraints
* scaling rules
* render schemas
* depth rules

The AI relies ENTIRELY on this predefined package.

==================================================
PHASE 1 FINAL GOAL
==================

The avatar engine should behave like:

* a deterministic procedural vector avatar system
* a Nintendo-style modular rendering engine
* a strict skeletal composition engine
* a coordinate-safe procedural character engine

Everything must:

* remain anatomically correct
* remain structurally correct
* remain directionally correct
* remain visually cohesive
* remain coordinate-safe
* remain render-safe

The final result should:

* never generate broken anatomy
* never generate disconnected limbs
* never generate floating body parts
* always preserve proper structure
* always preserve attachment logic
* always preserve procedural consistency

==================================================
PHASE 2 — BACKGROUNDS + OBJECTS + WORLD SYSTEM
==================================================

You are building PHASE 2 of the production-grade procedural SVG/vector engine.

PHASE 1 already established:

* avatar systems
* coordinate systems
* skeleton systems
* anchor systems
* directional systems
* deterministic JSON rendering
* anatomical validation systems
* modular SVG rendering

PHASE 2 expands the system into:

* environments
* world generation
* backgrounds
* props
* buildings
* terrain
* vegetation
* world objects
* scene composition
* environmental coordinate systems
* environmental attachment systems

==================================================
BACKGROUND / WORLD COORDINATE SYSTEM
====================================

Backgrounds and world objects MUST ALSO use strict coordinate systems.

Background systems must define:

* world coordinates
* object anchors
* parallax layers
* collision zones
* environmental attachment points
* ground alignment rules
* perspective scaling rules

==================================================
STRICT OBJECT COORDINATE RULES
==============================

Every object MUST define:

* world position
* local origin
* pivot
* depth
* collision bounds
* valid placement surfaces
* attachment compatibility

The AI must NEVER place:

* buildings floating in sky
* lamps upside down
* trees underground
* chairs sideways
* roads vertically
* clouds underground

==================================================
LOCAL OBJECT SPACE SYSTEM
=========================

Every object has its OWN local coordinate universe.

Object coordinates are NOT relative to screen space.

Objects are assembled locally first.

ONLY AFTER assembly are they placed into world space.

Examples:

A tree defines:

* trunk root
* branch anchors
* leaf anchors

A building defines:

* door anchors
* roof anchors
* window anchors

A vehicle defines:

* wheel anchors
* door anchors
* light anchors

==================================================
OBJECT HIERARCHICAL TRANSFORM SYSTEM
====================================

Objects MUST use parent-child transform inheritance.

Example:

treeRoot
→ trunk
→ branches
→ leaves

buildingRoot
→ walls
→ roof
→ doors
→ windows

==================================================
WORLD PLACEMENT RULES
=====================

All objects MUST obey valid environmental placement.

Examples:

* trees anchor to terrain
* benches anchor to sidewalks
* lamps anchor to ground
* doors anchor to buildings
* roads align to terrain
* bridges align to support points

==================================================
ENVIRONMENTAL DEPTH SYSTEM
==========================

The world system MUST support:

* foreground layers
* midground layers
* background layers
* parallax layers
* atmospheric scaling
* depth transforms

==================================================
SCENE COMPOSITION RULES
=======================

Scenes MUST preserve:

* visual cohesion
* coordinate consistency
* perspective consistency
* depth consistency
* collision-safe placement
* modular assembly==================================================
WORLD VALIDATION SYSTEM
=======================

The renderer MUST reject:

* floating objects
* invalid terrain placement
* invalid collision overlap
* invalid anchors
* invalid depth relationships
* invalid environmental transforms

==================================================
WORLD JSON OUTPUT RULES
=======================

The AI must ONLY:

* assemble predefined world assets
* apply valid transforms
* obey world coordinate systems
* obey placement rules
* obey collision rules
* obey environmental constraints

==================================================
PHASE 2 FINAL GOAL
==================

The world engine should behave like:

* a deterministic procedural environment engine
* a modular Nintendo-style world system
* a coordinate-safe object placement engine
* a procedural SVG scene system

Everything must:

* remain structurally correct
* remain perspective correct
* remain coordinate-safe
* remain render-safe
* remain modular
* remain scalable

==================================================
PHASE 3 — MOVEMENT + ACTIONS + BEHAVIOR SYSTEM
==================================================

You are building PHASE 3 of the production-grade procedural SVG/vector engine.

PHASE 1 established:

* avatars
* skeleton systems
* coordinate systems
* anatomical systems

PHASE 2 established:

* environments
* objects
* world systems
* scene systems

PHASE 3 expands the engine into:

* movement
* animation
* behavior
* action interpretation
* scene interaction
* runtime directional movement
* world navigation
* cinematic avatar behavior

==================================================
FOUNDATIONAL ARCHITECTURE RULE
==============================

The AI is NOT the renderer.

The AI is NOT the animation engine.

The AI is NOT the movement engine.

The browser/client owns:

* rendering
* coordinate systems
* animation systems
* movement systems
* interpolation systems
* pathing systems
* scaling systems
* camera systems
* skeleton systems
* runtime transforms

The AI ONLY:

* selects valid actions
* sequences actions
* configures action parameters
* selects movement targets
* interprets user intent
* returns deterministic JSON instructions

==================================================
STRICT MOVEMENT COORDINATE RULES
================================

ALL movement and animation MUST preserve coordinate discipline.

Body parts may NEVER detach.

Animations MUST preserve:

* anchors
* skeleton joints
* parent transforms
* directional coordinate maps

Animations may NEVER:

* break anatomy
* disconnect skeletons
* float body parts
* violate anchor constraints

==================================================
PREBUILT CLIENT-SIDE ACTION SYSTEM
==================================

The client MUST contain a PREBUILT ACTION LIBRARY.

The AI does NOT invent animations dynamically.

The client-side engine owns:

* animation sequences
* keyframes
* interpolation
* easing
* directional blending
* movement timing
* coordinate transforms
* runtime motion

==================================================
PREBUILT ACTION LIBRARY
=======================

The client must contain at minimum:

* idle
* walk
* run
* jog
* sneak
* crouch
* jump
* fall
* sit
* stand
* lieDown
* sleep
* wakeUp
* wave
* point
* talk
* laugh
* cry
* dance
* spin
* fight
* attack
* block
* hug
* shakeHands
* cheer
* clap
* lookAround
* confused
* scared
* celebrate
* swim
* fly
* hover
* crawl
* climb
* openDoor
* closeDoor
* pickUp
* dropObject
* throw
* kick
* push
* pull
* drink
* eat
* useComputer
* talkToGroup
* walkAway
* approachCamera
* turnLeft
* turnRight
* turnAround
* enterScene
* exitScene

==================================================
ACTION CONTEXT PACKAGE
======================

The client MUST contain an ACTION CONTEXT PACKAGE defining:

* action IDs
* animation sequences
* directional variants
* valid transitions
* movement timing
* movement speeds
* scaling behavior
* depth transforms
* coordinate-safe transforms
* interaction compatibility==================================================
ACTION COORDINATE SYSTEM
========================

Every action MUST obey strict coordinate mappings.

Each action defines:

* skeleton transforms
* anchor transforms
* directional transforms
* coordinate offsets
* body constraints
* motion curves
* scale curves

==================================================
MOVEMENT SYSTEM CLARIFICATION
=============================

Movement DOES NOT move body parts independently through world space.

Movement works like this:

1. Local animation plays
2. Entire avatar root moves through world space

Example:

* walk cycle animates legs LOCALLY
* avatarRoot moves globally across scene

The walking animation itself ALWAYS remains inside LOCAL CHARACTER SPACE.

==================================================
MULTI-DIRECTIONAL ACTION SUPPORT
================================

Every action must support:

1. Front
2. Front-Left
3. Left
4. Back-Left
5. Back
6. Back-Right
7. Right
8. Front-Right

Each direction has:

* unique animation transforms
* unique layering
* unique perspective transforms
* unique attachment transforms

==================================================
WORLD MOVEMENT COORDINATE SYSTEM
================================

Movement occurs inside strict world coordinates.

The client defines:

* walkable zones
* collision zones
* interaction zones
* room coordinates
* navigation paths
* camera boundaries

The AI ONLY references:

* valid destinations
* valid interaction points
* valid movement states

==================================================
DISTANCE / SCALE SYSTEM
=======================

Distance scaling affects ONLY:

* avatarRoot transform
* world transform
* camera-relative scaling

It does NOT alter:

* skeleton proportions
* attachment logic
* anatomical relationships

The avatar may shrink or enlarge relative to camera distance,
BUT internal structure NEVER changes.

==================================================
USER EXPERIENCE LAYER
=====================

Users may issue natural language behavior requests.

Examples:

* walk far away
* go to the door
* dance
* sit down
* run toward the camera
* sleep
* fly upward
* wave at me
* walk into the forest

The AI interprets these requests into deterministic ACTION JSON.

==================================================
ACTION INTERPRETATION SYSTEM
============================

The AI acts as:

* a behavior interpreter
* an action sequencer
* a movement instruction generator

The AI does NOT:

* animate directly
* generate SVG
* generate interpolation math

The AI ONLY returns:

* action IDs
* target IDs
* destination coordinates
* timing instructions
* sequence instructions
* state transitions

==================================================
ACTION JSON OUTPUT SYSTEM
=========================

The AI must return deterministic machine-readable JSON.

The JSON may include:

* currentAction
* nextAction
* targetPosition
* targetEntity
* movementSpeed
* direction
* animationVariant
* depthTarget
* scaleTarget
* transitionType
* interactionType

==================================================
ACTION STATE MACHINE SYSTEM
===========================

The client-side engine maintains:

* current action
* previous action
* next queued action
* transition state
* direction state
* movement state
* interaction state
* emotional state

The AI may request valid state transitions only.

==================================================
RUNTIME MEMORY SYSTEM
=====================

The client maintains runtime memory including:

* current avatar state
* current direction
* current animation
* current position
* current depth
* current scale
* current target
* current movement path
* current interaction state

==================================================
BACKGROUND / OBJECT MOVEMENT SUPPORT
====================================

Background objects may also support actions.

Examples:

* doors opening
* elevators moving
* cars driving
* trees swaying
* lights flickering
* crowds moving
* weather animating

All background/object movement ALSO obeys:* strict coordinates
* strict anchors
* strict transform systems

==================================================
STRICT ANIMATION VALIDATION
===========================

The renderer must reject:

* invalid transforms
* broken skeletons
* detached limbs
* invalid scaling
* invalid direction states
* invalid action transitions
* invalid anchor movements

The system must NEVER render broken anatomy.

==================================================
FINAL RUNTIME PIPELINE
======================

USER REQUEST
→ CLIENT LOADS PRESET CONTEXT PACKAGES
→ CLIENT LOADS ACTION CONTEXT PACKAGE
→ CLIENT LOADS MOVEMENT ENGINE
→ CLIENT LOADS ANIMATION STATE MACHINE
→ CLIENT BUILDS RENDERING KNOWLEDGE PACKAGE
→ CLIENT SENDS FULL CONTEXT TO AI
→ AI RETURNS DETERMINISTIC ACTION JSON
→ CLIENT VALIDATES ACTION JSON
→ CLIENT EXECUTES PREBUILT ANIMATIONS
→ CLIENT HANDLES:

* interpolation
* movement
* scaling
* depth
* camera
* rendering
* directional transitions
* animation blending
* world interaction

==================================================
PHASE 3 FINAL GOAL
==================

The final engine should behave like:

* a Nintendo-style procedural animation engine
* a deterministic vector character engine
* a runtime action interpretation system
* an AI-assisted behavior engine
* a browser-native procedural world system

The AI behaves like:

* a structured behavior director

The browser behaves like:

* the renderer
* the animation engine
* the movement engine
* the runtime simulation engine

The final result should feel:

* smooth
* alive
* responsive
* cinematic
* scalable
* cohesive
* animation-safe
* coordinate-safe
* production ready
```
