# Riftbound Competitive Insights — Observations

A running record of everything we've found analyzing the Regional Qualifier circuit.
Built from raw tournament-platform exports: decklists, registrations, and full
round-by-round pairings.

---

## The dataset

- **8 Regional Qualifiers**, **~12,300 submitted decklists**, **~45,000 matches**.
- Regions: **EU** (Bologna, Lille, Utrecht), **NA** (Las Vegas, Atlanta, Vancouver, Hartford), **APAC** (Sydney).
- Every event has decklists + registrations + 16 rounds of pairings, joined per player by a stable user-id.
- Player PII (names, emails) deliberately excluded from the analysis build.

---

## The spine: format timeline (derived from the data, not assumed)

Win rates are meaningless if you pool across a ban or a set release. The format
boundaries fall straight out of card-presence cliffs:

- **Format A — Spiritforged, pre-ban** (Bologna, Las Vegas): 28 legends. Obelisk of Power, Fight or Flight, Called Shot all legal.
- **Format B — Spiritforged, post-ban** (Lille, Atlanta): a coordinated **ban wave** lands between Las Vegas and Lille.
- **Format C — Unleashed** (Sydney, Vancouver, Utrecht, Hartford): set release; legend pool jumps **28 → 39**.

**The ban wave** (all dropped to 0% the moment Lille started):

| Card | Pre-ban presence | After |
|---|---|---|
| Obelisk of Power | ~50% of every deck | 0% |
| Fight or Flight | ~41% | 0% |
| The Dreaming Tree | ~28% | 0% |
| Called Shot | ~24% | 0% |
| Reaver's Row, Draven Vanquisher | ~15–20% | 0% |

> **Takeaway:** a single card in 50% of decks across archetypes is the textbook
> over-centralization signal. These presence levels were screaming *before* the ban —
> the case for a pre-RQ ladder feed + a written ban threshold.

---

## Balance & power

### Winner-meta is the sharpest balance signal (sharper than win rate)
The real question isn't "what's played," it's "what's over-represented among the
people who win." Per format, a legend's share of **Top-64 finishers** vs the **field**:

| Format | Top winner-deck | Winners | Field | Gap | p |
|---|---|---|---|---|---|
| Spiritforged pre-ban | **Draven** | **43.3%** | 13.4% | **+30pp** | <0.0001 |
| Spiritforged post-ban | Irelia | 28.1% | 12.6% | +15.5pp | <0.0001 |
| " | Draven | 22.7% | 12.9% | +9.8pp | 0.001 |
| Unleashed | Master Yi | 20.3% | 9.4% | +10.9pp | <0.0001 |

> **Draven pre-ban was nearly half of every decisive table.** That's the number you
> take to a balance meeting — and it's exactly the deck that got banned.

### The ban didn't kill Draven — the rotation did
- Draven's win rate barely moved through the ban (≈60% in both Spiritforged formats).
- Its **play rate collapsed only at the set release** (≈15% → 1.4% in Unleashed).
- So the lever that actually retired the deck was **rotation, not the ban**. If you
  want to remove a deck, rotation is the reliable tool; bans mostly trim individual cards.

### The matchup matrix reveals what win rate hides: rock-paper-scissors
From ~10,000 real matches per format (legend vs legend):
- **Unleashed is healthy** — Master Yi beats most of the field but **loses to Sivir (40%)**; Sivir crushes Master Yi but **folds to Viktor (23%)**; Viktor beats Sivir but loses back to Master Yi. No deck dominates the triangle.
- **Pre-ban was not** — Draven's row beats nearly every column. A near-uniformly-favored deck is the matchup-level fingerprint of a format-warping problem.

---

## Is the metagame healthy? (with caveats)

- **Diversity looks good but is partly manufactured.** Unleashed shows **30.8 effective
  archetypes**, but only **21.3 are competitively viable** (≥48% win, ≥20 games).
  ~30% of the apparent diversity is non-competitive.
- **16 legends are played but never make Top-8.** The driver is the **"best-of" foil prize**
  ($10–20k): it rewards being the single best pilot of a legend, so players rationally pick
  *under-contested* legends — inflating the long tail. The diversity number is partly a
  prize artifact, not genuine balance.
- **All 6 domains are viable** (no dead color), which is a genuinely healthy design finding.

---

## Skill-adjusted strength — weak card vs. weak pilots

Raw win rate can't tell a bad card from a casually-piloted one. Controlling for pilot
skill (each legend's win rate minus its pilots' leave-this-legend-out career skill):

- **Genuinely weak** (strong players still lose → buff candidates): **Yasuo, Jinx, Leona, Ornn**.
- **Selection effect, NOT weak design** (low win rate fully explained by casual pilots):
  **Renata, Vi, Garen** — corrects an earlier "dead content" claim.
- **Strong but unpopular** (overperform their pilots): **Draven** (still wins ~+21 above its
  now-casual pilots — the card is fine, just abandoned), **Kai'Sa**. *(Rumble's huge residual
  is small-sample noise — only ~24 pilots.)*

---

## Content reception — novelty or power?

- New-legend adoption split by finisher tier: **31.8% of Top-64 decks vs 32.9% of the field**.
- The gap is **not statistically significant** (z=−0.37, p=0.71).
- **Read:** we can't claim winners adopt new content differently — which is the finding.
  The set was taken up *evenly* across tiers, i.e. it **didn't disproportionately help the
  top tables**. That's a *balanced* release (no power-creep signal), not a measured preference.

---

## Learning curve — how fast the set gets "solved"

Win rate can't show learning (it's zero-sum, pinned near 50%). **Decklist convergence**
can — the average card-list similarity among a legend's pilots rises as the community
agrees on the optimal build.

- Across the 4 Unleashed events (Sydney → Vancouver → Utrecht → Hartford),
  **9 of 10 new legends rose in convergence** (avg +0.13 Jaccard).
- **Kha'Zix** went from 0.32 (wildly experimental) to 0.66 (largely solved).
- **Convergence speed predicts when a format goes stale** — a direct input to set cadence.

---

## Player behavior

### Drops — the 18-point reality
Day-2 needs **≥18 match points** (W=3, D=1, L=0) over 8 Swiss rounds, so a 3rd loss is
mathematical elimination. Of players who left mid-Day-1 (across all 8 events):
- **70.4% rational elimination** — left the instant Day-2 became impossible (the 3-loss wall). That's the format, not a problem.
- **20.5% casual bail** — lost once (or no-showed) and left. The walk-up crowd.
- **9.2% lost hope** — still mathematically alive but quit.
- The actionable slice is the casual-bail + lost-hope ~30%; side events or a softer cut would recover them.

### Repeat players — skill is real, and a circuit asset
- **18% of players (1,536) appear in ≥2 events.**
- A **top-25% finisher repeats top-25% 55% of the time** (base rate 25%; cross-event finish correlation r=0.31). Results are skill, not variance — this validates the skill-adjusted model and supports a **cross-circuit player rating / broadcast power-ranking**.
- **Deck loyalty: 46% keep their legend event-to-event within a set, but only 24% across the set release.** Content resets player identity.

### Migration — behavior diverges from power
- Of the **239 Draven pilots** who returned for an Unleashed event, **only ~5% kept Draven** — the rest flowed to **Master Yi, Diana, Irelia**.
- The people who knew the deck best abandoned a deck that was *still winning above baseline*.
- **Power said "fine," players said "no."** That divergence is the player-feedback signal raw win rate misses.

---

## Methodology & honest caveats (the rigor)

- **Win rate excludes byes.** A bye is a free win with no opponent loss; including byes
  lifts the whole field to ~53%. Subtracting them (per-match bye flags from the pairings)
  restores a true **~51% baseline** — and that residual above 50% is a real **selection
  effect**: deck-submitters are slightly better than casual walk-ups who drop early.
  *Match points keep byes* (they legitimately count toward the Day-2 cut).
- **Win rate ≠ "a problem."** It's one input. A deck is a problem only when it stacks:
  high win rate + high meta share + winner-meta over-indexing + persistence. Use winner-meta,
  the matchup matrix, and skill-adjustment to confirm.
- **Quantified player feedback = revealed preference**, not win rate. What players *choose*
  (play rate), *abandon* (Draven), and *quit over* (drops) is the honest sentiment signal.
- **Never pool win rates across a ban or set release** — read every metric per-format.
- **Watch-zone threshold auto-adapts** (> 1 SD above the mean in both play and win,
  recomputed per format/event) rather than a flat number that's wrong for half the scopes.

---

## What did NOT hold up (cut or corrected)

- **In-event attrition was dropped.** Once you see drops are mostly rational elimination
  (3rd loss) plus casual single-loss bail, there's no load-bearing competitive-health signal
  without round-by-round data + exit surveys.
- **"Novelty not power" reception claim was retracted** — the tier gap isn't significant (p=0.71).
- **"Leona/Renata are dead content" was corrected** — skill-adjustment shows Leona/Ornn are
  genuinely weak but Renata/Vi are selection artifacts (fine cards, casual pilots).

---

## Data gaps / next steps

- **No pre-RQ competitive feed** (digital ladder / locals). RQ-to-RQ is too slow and too
  high-stakes to be the first ban detector — closing this is itself an Insights recommendation.
- **Per-game (best-of-3) data** exists in the pairings but isn't used yet; would enable
  game-win% alongside match-win%.
- **Predictive win-probability model** from decklist composition — not built.

---

*Prototype analysis — Anzid, 2026.*
