---
title: "UI kit naming — candidates + domain availability"
description: "Replacement for Helix: chosen name Apolyx (runner-up hyviro), plus physics/orbit, H/O, and Apollo/Freyja/Dionysus blends with .com/.dev/.app + npm checks"
created: 2026-10-11
updated: 2026-10-11
tags:
  - idea
  - ui-kit
  - naming
  - domains
---

# UI kit naming — candidates + domain availability

> Open this when picking the final kit name. "Helix" is already used by another UI kit, so it is out. Product intent: [[../../feature_list/ui-kit/00-intent]].

## Criteria

- Short (4–7 letters) and easy to type, because component names and the CLI will start with it
- Sounds smooth when spoken: `npx <name> add button`
- Hints at physics: elastic, spring, orbit, gyre, oscillation — **or** Greek / Norse myth soft echoes
- Prefer starts with **H** or **O** (second search pass)
- Made-up names are fine; real god names are almost always taken
- Ideally free on `.com`, `.dev`, `.app` and as an unscoped npm package

## How availability was checked

Checked on 2026-10-11 against the live registries:

- `.com` — Verisign RDAP (`rdap.verisign.com`)
- `.dev` / `.app` — Google Registry RDAP (`pubapi.registry.google`)
- npm — `registry.npmjs.org/<name>`

**FREE** means the registry has no record (HTTP 404). Caveats:

- It does not show **premium pricing**. Check the price at a registrar before relying on a name.
- **taken** `.com` names are often parked or for sale. A taken `.com` is not a blocker if `.dev` is free; most dev tools use `.dev`.
- Availability changes daily. Register quickly once you decide.

---

## Decision — Apolyx (chosen 2026-10-11)

**apolyx** — from *Apollo* (music, poetry, art, light) + crisp *-yx* ending. Free on `.com`, `.dev`, `.app` and npm when checked on 2026-10-11. Reads as `npx apolyx add button`, optional component prefix `Ap`.

Runner-up: **hyviro** (also free on all four).

Next: register `apolyx.dev` (plus `.com` / `.app`) and reserve the npm name `apolyx` (and the `@apolyx` org) before announcing.

---

## Pass 3 — gods of beauty and art (Apollo, Freyja, Dionysus)

Blends built from **Apollo** (music, poetry, light), **Freyja** (love, beauty) and **Dionysus** (theatre, festivity, ecstasy). Checked 2026-10-11.

### Best picks — free on all four

| Name                                                | Built from                 | Feel                     | Notes                                        |
| --------------------------------------------------- | -------------------------- | ------------------------ | -------------------------------------------- |
| **apolvi**                                          | Apollo + *-vi*             | light, musical           | Same "-vi" rhythm as hyviro; 6 letters       |
| **apolyx**                                          | Apollo + *-yx*             | crisp, technical         | Good dev-tool sound                          |
| **apolvo**                                          | Apollo + *-vo*             | round, smooth            |                                              |
| **apreya**                                          | Apollo + Freyja            | beauty + art in one word | Pretty, 6 letters                            |
| **apryja** / **apyja**                              | Apollo + Freyja            | more Norse               | `j` is slightly harder to type               |
| **freyix**                                          | Freyja + *-ix*             | beauty, techy ending     | 6 letters                                    |
| **freypo**                                          | Freyja + Apollo            | playful                  |                                              |
| **dionvi**                                          | Dionysus + *-vi*           | theatre, expressive      | Pairs nicely with hyviro style               |
| **dionlo** / **dionelo** / **dionyo**               | Dionysus soft forms        | smooth                   |                                              |
| **nysvi**                                           | Dio**nys**us + *-vi*       | short, unusual           | 5 letters                                    |
| **dyfrey**                                          | Dionysus + Freyja          |                          |                                              |
| **apofrey** / **freyapo**                           | Apollo + Freyja            |                          | Longer                                       |
| **dionapo** / **diofrey**                           | Dionysus + Apollo / Freyja |                          | Longer                                       |
| **freyviro** / **dioviro**                          | god + hyviro ending        |                          | Ties directly to your lead name; 7–8 letters |
| **frepolo** / **fryapo** / **freyollo** / **frejy** | other blends               |                          | Less smooth                                  |

### Free on .dev + .app + npm (`.com` taken)

apolio, apolix, apolla, apolly, apolra, apolyn, apoviro, apryo, apyro, apodion, dionra, dionya, dionyx, dyonis, dyonix, dipolo, diviro, frapo, frejo, frelyo, frevi, freyla, freyli, freylo, freyon, freyra, freyvi, freyvo, freyza, fryja, fryo, nysio, nyso

### Taken / weak

apolo, freja, dyon (all taken) · dionix, frelo, nysa (domains taken) · apelo, apoli, apolune, apreo, diony, dioro, frelio, frevo, freyo (partial)

### Recommendation for this pass

- **apolvi** — closest in rhythm to hyviro; Apollo = arts and light.
- **apreya** — literally Apollo + Freyja, beauty + art.
- **dionvi** — Dionysus theatre energy with the same "-vi" ending.

**apolyx** from this pass was chosen as the product name (see Decision above).

---

## Recommended shortlist (updated after H/O + gods pass)

| Rank | Name | Letter | Vibe | .com | .dev | .app | npm | Notes |
|------|------|--------|------|------|------|------|-----|-------|
| 1 | **hoscy** | H | *oscillation* (hoscy ≈ oscy with H) | FREE | FREE | FREE | FREE | 5 letters, easy to type. Soft physics. Watch: GitHub project **HOSCY** (VRChat OSC tool — unrelated UI kit). |
| 2 | **hygelo** | H | *Hygeia* (Greek health goddess) + elastic *-elo* | FREE | FREE | FREE | FREE | Smooth myth echo, healthy / clean UI vibe. |
| 3 | **orunlo** | O | *Orun* / orbit + soft *-lo* | FREE | FREE | FREE | FREE | Orbit feel, easy `npx orunlo add`. |
| 4 | **orbyno** | O | orbit + made-up | FREE | FREE | FREE | FREE | Clear orbit read. |
| 5 | **odinlo** | O | *Odin* (Norse) + soft ending | FREE | FREE | FREE | FREE | Myth without using the raw god name. |
| 6 | **oelor** | O | soft invented; elastic / orbit mouthfeel | FREE | FREE | FREE | FREE | 5 letters. Very typeable. Minor: rare person surname "Oelor". |
| 7 | **hestaq** | H | *Hestia* (Greek hearth) + q twist | FREE | FREE | FREE | FREE | Warm / home UI vibe; `q` is slightly awkward. |
| 8 | **olymq** | O | *Olympus* short form | FREE | FREE | FREE | FREE | God-mountain vibe; short but `q` quirky. |
| 9 | **orphlo** | O | *Orpheus* soft form | FREE | FREE | FREE | FREE | Greek arts / harmony echo. |
| 10 | **oscyla** | O | oscillation | FREE | FREE | FREE | FREE | Physics-forward. |
| — | **gyrelo** | G | gyre / orbit (from earlier pass) | FREE | FREE | FREE | FREE | Still strongest non-H/O physics pick. |
| — | **coilo** | C | coil / spring | taken | FREE | FREE | FREE | Best short non-H/O if `.com` not required. |

**If you want H or O + free `.com`:** pick among **hoscy**, **hygelo**, **orunlo**, **orbyno**, **odinlo**, **oelor**.

**If you want Norse:** **odinlo** (Odin) or **hodylo** (Höðr / Hod soft form — also all-four free).

**If you want Greek:** **hygelo** (Hygeia), **hestaq** (Hestia), **orphlo** (Orpheus), **osirelo** (Osiris — Egyptian, all-four free), **olymelo** / **olymq** (Olympus).

---

## How it reads in code

```bash
npx hoscy init
npx hygelo add button
npx orunlo add card
```

```tsx
import { Button } from "@/components/hoscy/button";
<HoButton />   // hoscy
<HyButton />   // hygelo
<OrButton />   // orunlo / orbyno
<OdButton />   // odinlo
```

---

## Pass 2 — H / O + Greek & Norse (2026-10-11)

~177 focused candidates checked (H\* / O\*, 4–7 letters, made-up + deity soft-forms).

### All four free (H / O pass)

| Name                                | Origin hint                  | .com | .dev | .app | npm  |
| ----------------------------------- | ---------------------------- | ---- | ---- | ---- | ---- |
| **hoscy**                           | oscillation                  | FREE | FREE | FREE | FREE |
| **hoscyx**                          | oscillation                  | FREE | FREE | FREE | FREE |
| **hoscil**                          | oscillation                  | FREE | FREE | FREE | FREE |
| **hygelo**                          | Hygeia (Greek)               | FREE | FREE | FREE | FREE |
| **hyorlo**                          | hy + orbit                   | FREE | FREE | FREE | FREE |
| **hyviro**                          | hy + vibe/orbit              | FREE | FREE | FREE | FREE |
| **hestaq**                          | Hestia (Greek)               | FREE | FREE | FREE | FREE |
| **helasy**                          | Helios soft                  | FREE | FREE | FREE | FREE |
| **helsyx** / **helsyq**             | Helios soft                  | FREE | FREE | FREE | FREE |
| **hemerlo**                         | Hemera (Greek day)           | FREE | FREE | FREE | FREE |
| **hephlo**                          | Hephaestus soft              | FREE | FREE | FREE | FREE |
| **hathelo**                         | Hathor (Egyptian)            | FREE | FREE | FREE | FREE |
| **hectelo**                         | Hector soft                  | FREE | FREE | FREE | FREE |
| **hodylo**                          | Höðr / Hod (Norse)           | FREE | FREE | FREE | FREE |
| **hugyna**                          | Huginn (Norse raven)         | FREE | FREE | FREE | FREE |
| **odinlo**                          | Odin (Norse)                 | FREE | FREE | FREE | FREE |
| **odynlo**                          | Odin / odyn twist            | FREE | FREE | FREE | FREE |
| **odyrix**                          | Odysseus soft                | FREE | FREE | FREE | FREE |
| **oedelo**                          | Oedipus soft (awkward brand) | FREE | FREE | FREE | FREE |
| **oelor** / **oelora**              | invented                     | FREE | FREE | FREE | FREE |
| **olymelo** / **olymq**             | Olympus                      | FREE | FREE | FREE | FREE |
| **orbyno**                          | orbit                        | FREE | FREE | FREE | FREE |
| **orunlo** / **orunq** / **orunra** | orbit / orun                 | FREE | FREE | FREE | FREE |
| **orphlo**                          | Orpheus (Greek)              | FREE | FREE | FREE | FREE |
| **orestlo**                         | Orestes soft                 | FREE | FREE | FREE | FREE |
| **orlasx**                          | orbit/elastic mash           | FREE | FREE | FREE | FREE |
| **oscyla**                          | oscillation                  | FREE | FREE | FREE | FREE |
| **osirelo**                         | Osiris (Egyptian)            | FREE | FREE | FREE | FREE |
| **osyelo**                          | Osiris soft                  | FREE | FREE | FREE | FREE |

### Free on .dev + .app + npm (`.com` taken) — best H/O picks

heimlo, heimix, heimda, heimra *(Heimdall)*, hekat / hekato *(Hecate)*, herelo / herix / herixo *(Hera)*, hebelo *(Hebe)*, hodelo / hodrix / hodyna *(Höðr)*, hugelo / hugix / hugino *(Huginn)*, hovelo / horbit / horbo / horalo, hyvelo / hyvora / hyralo / hyreo, odinix / odinq / odyna / odynix *(Odin)*, orvelo / orvea / orielo / oriono *(orbit / Orion)*, orphix / orpho *(Orpheus)*, osirix / osiraq *(Osiris)*, olymix / olymo / olympa / olymra *(Olympus)*, oscylo / oscyra, orelo, orcelo, opari / opariq, opselo

### Raw god names — almost always taken

Do **not** use the plain names as the product brand (domains + cultural load):

- Greek: hera, helios, hermes, hestia, apollo, ares, athena, artemis, zeus, atlas, nike, iris, eros, gaia, nyx, selene, chaos, titan, olympus, orion, orpheus, hecate, hypnos, …
- Norse: odin, thor, freya, freyr, loki, tyr, baldr, njord, skadi, ullr, vidar, ymir, fenrir, mimir, hugin, munin, …

Soft blends (**odinlo**, **hygelo**, **orphlo**, **hestaq**, **heimlo**) keep the vibe without colliding with the deity brand.

### Collision notes (web search)

| Name | Note |
|------|------|
| hoscy | Unrelated GitHub **HOSCY** (VRChat OSC companion). Not a UI kit; still a name echo. |
| oelor | Rare personal surname / GitHub handle; no UI kit. |
| Plain Odin / Thor / Hera / … | Heavy existing brands + domains taken. |

---

## Pass 1 — physics / orbit (earlier same day)

### All four free

| Name | .com | .dev | .app | npm |
|------|------|------|------|-----|
| gyrelo | FREE | FREE | FREE | FREE |
| gyralo | FREE | FREE | FREE | FREE |

### Free on .dev + .app + npm (`.com` taken)

orbiqo¹, orbelo², coilo, orbiv, gyrix, gyreo, gyrova, gyrona, gyrio, orbelix, orbizo, orbiqa, orbeno, orbiro, elasko, elastyx, spryo, sprynx, coilyx, boinq, wobblo, tensyx, lagrio, apsido, oscila, oscilo, torsyn, torsio, torsiq, inertio, inerta, tauten, recoila, apsiq, velasti, spiralo, elastq

¹ ORBIQO clothing brand. ² Orbelo AI analytics SaaS.

### Taken on all three domains (sample)

orba, orbix, orbyt, orvo, kinet, gyro, apsis, torq, vela, hooke, orbita, tauri, lunari, zorbit, spryng, elastica, …

---

## Next step

Done: the docs now use **Apolyx** ([[README]], [[2026-10-10-apolyx-portable-ui-kit]], [[../../feature_list/ui-kit/00-intent]]); docs app path is `apps/apolyx`. Remaining: register the domains and reserve the npm name.
