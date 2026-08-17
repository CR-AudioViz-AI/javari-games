# Javari Arcade — the visual standard

Approved by Roy, 2026-08-16. Reference build: `app/play/dusk-keep/page.tsx`.
Every game is built to this or it does not ship.

## The four things that made the difference

Earlier builds were flat grey boxes under one daylight lamp and read as 1999.
Fixing it was not about polygon count.

1. **Textured PBR surfaces.** `lib/g3d/tex.ts` generates a colour, roughness AND
   normal map for every material at load. Cut stone with mortar, chipped
   corners, damp patches. Planks with grain and knots. Overlapping roof tiles.
   Grass with clumps, dirt and blades. Normals derived from a height canvas by
   Sobel. **Untextured `MeshStandardMaterial` is the single biggest tell of an
   amateur scene.**

2. **The scene lights itself.** Real point lights inside the geometry —
   torches flickering on independent noise, lit windows with their own lights.
   A single directional light from outside flattens everything. Light sources
   *inside* a scene are what create depth.

3. **Atmosphere.** Exponential fog, rising embers, water with scrolling normal
   maps, cloth whose vertices displace along a travelling wave. Empty air is
   what makes a scene feel like a model on a table.

4. **Silhouette detail.** Crenellations, arrow slits, buttresses, machicolation
   rings, a portcullis lattice. The test: is it recognisable as a black shape?

Plus: ACES filmic tone mapping, exposure slightly above 1, PCF soft shadows,
and a low cinematic camera so structures loom rather than sit.

## What still has to be added

- Real gameplay on top of the look
- Multiplayer via Supabase Realtime
- Multiple levels
- Meshy-6 via fal.ai for characters, if procedural geometry is not enough

## Files

- `lib/g3d/tex.ts` — procedural PBR surfaces
- `lib/g3d/stage.ts` — three.js stage, tone mapping, three-point rig
- `lib/g3d/stylised.ts` — brighter Clash-style kit (secondary)
- `app/play/dusk-keep/page.tsx` — **the reference**

CR AudioViz AI, LLC · EIN 39-3646201
