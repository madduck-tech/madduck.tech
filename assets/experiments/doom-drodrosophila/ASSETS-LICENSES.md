# Asset attribution

## E1M1 map

- Title: **Doom E1M1: Hangar - Map**
- Author: **vrchris**
- Source: https://sketchfab.com/3d-models/doom-e1m1-hangar-map-2148fb6a3fe7454b901fcea67d70b318
- Declared license: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), from embedded GLB metadata.
- Local input: `doom_e1m1_hangar_-_map.glb`.
- Production file: `models/e1m1.glb`, 335,764 bytes. Byte-for-byte copy; no texture, palette, UV, or material changes.
- SHA-256: `98d80e757d257d435dd5cedee39fb737b8e834bd872288dbe6d720f17adf58bc`.
- Runtime adaptations: uniform scale of 1/64; origin at the verified spawn; individual door surfaces held open; the ambush platform lowered; the secret lift animated; camera-intersecting ceiling patches temporarily hidden. These are exploration/view adaptations, not original DOOM gameplay.

## Doom Slayer head

- Original title: **DOOM eternal slayer toy**
- Author: **DJ_Nugget**
- Source: https://sketchfab.com/3d-models/doom-eternal-slayer-toy-5f7c26b0e19f4010a2edf43bd670a433
- Declared license: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), from the supplied toy GLB metadata.
- User-prepared input: `doomguy-head.blend`, containing the separate `Doom Guy Head` mesh. No new body separation was required.
- Source blend SHA-256: `8897b228f47133f52deee683d6a0c26c9fcf8087b8a3c936afad969a2bf5b954`.
- Preparation: exported the selected head in its active scene using **Blender MCP**. Preserved geometry and UVs; exported the existing Principled material as metallic/roughness plus supported specular/IOR extensions. Converted embedded texture payloads to JPEG at quality 85 where alpha permitted. No source blend save or source mesh edit.
- Production file: `models/doom-slayer-helmet.glb`, 1,948 triangles. Runtime normalization sets attachment size, center, and facing.
- SHA-256: `4734cdc40b53ed33abdf4264a19c2b8525cc47684430e64df0dabcf169e9b4b6`.

## Engine and authored content

Three.js **0.186.0**, MIT license, is vendored locally with matching `GLTFLoader`, `BufferGeometryUtils`, and `SkeletonUtils`. See `lib/THREE-LICENSE.txt`. The fly body, controller, brain illustration, and scene code are authored for this website. The illustration is not a biological connectome or a trained neural simulation.

Navigation geometry was cross-checked against E1M1's shareware sector and player-start records using a temporary reference WAD from https://github.com/ebenupton/doom/blob/master/DOOM1.WAD. The WAD is not distributed with this site. The GLB is reflected on X relative to WAD coordinates: player start `(1056, -3616)`, angle 90°, maps to GLB `(-1056, 0, -3616)`, facing +Z.

DOOM and its characters belong to their respective rights holders. This is an unofficial experiment. Asset license declarations are provenance records, not an independent rights audit. The Sketchfab pages returned HTTP 403 during automated verification on 2026-09-17; author/source/license details were read from the supplied GLB metadata.
