# Domain context

## Project

A client-specific house study with a stable URL, private draft, published presentation, members and revision number.

## Project Document

The versioned JSON payload consumed by both the 2D Plan and 3D Model. It contains a Template identifier and all persisted Design data. Browser-only selection state is not part of the Project Document.

## Design

The editable state shared by the 2D Plan and 3D Model: furniture, dimensions, visibility and material choices.

## Template

The project-specific pair of 2D Plan and 3D Model modules. Platform behaviour—routing, access, persistence, publication and history—does not belong to a Template.

## Draft

The latest private Project Document. Owners and editors can change it; viewers can inspect it without writing.

## Publication

An explicit, immutable-at-a-revision copy of the Draft served by the public presentation URL. It lives separately so public access cannot expose unfinished Draft data.

## Revision

A monotonically increasing number attached to every saved Draft. Writes must provide their expected Revision to prevent silent overwrites.

## Member

An authenticated user related to a Project as owner, editor or viewer. An Invitation becomes a Membership when the invited email authenticates.
