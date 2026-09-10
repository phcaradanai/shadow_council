# Shadow Council

**Shadow Council** is a multiplayer social bluff and deduction game of concealed strikes, psychological tension, and shifting allegiances. Players balance scarce Power resources and survival Influence while determining whether opponents' declared strikes are genuine threats or daring bluffs.

---

## 1. MVP Core Rules Reference

The core ruleset is implemented and strictly enforced by the pure domain state machine:

| Parameter / Mechanic     | Specification       | Description                                                                                                                       |
| :----------------------- | :------------------ | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Players**              | 2 – 6 players       | 4 players recommended for primary social deduction.                                                                               |
| **Starting Influence**   | 3 Influence         | Reaching 0 Influence permanently eliminates a player. Influence is public.                                                        |
| **Starting Power**       | 2 Power             | Energy pool (maximum 3 Power). Power is **private**: opponents see `🔒 ?`.                                                        |
| **Active Turn: Strike**  | `(Target, Funding)` | Declare a Strike against an opponent. Privately commit `0` Power (Bluff) or `1` Power (Genuine, requires $\ge 1$ Power).          |
| **Active Turn: Recover** | $+1$ Power          | Passes turn safely and gathers resources (capped at 3 Power).                                                                     |
| **Reaction: Guard**      | Costs 1 Power       | Target deflects the strike completely. Both retain Influence.                                                                     |
| **Reaction: Challenge**  | Costs 0 Power       | Target calls the bluff. If attacker bluffed: **Attacker loses 1 Influence**. If strike was genuine: **Target loses 2 Influence**. |
| **Reaction: Yield**      | Costs 0 Power       | Target accepts the loss. **Target loses 1 Influence**.                                                                            |
| **Turn Timer**           | Configurable        | Host configures in Lobby: Enabled (30s, 45s default, 60s, 90s) or Disabled (`No Time Limit`).                                     |
| **Victory Condition**    | Sole Survivor       | The last remaining player with $\ge 1$ Influence wins the Council.                                                                |

---

## 2. Browser Client & UI Interaction Safety

The web client is built with **modular vanilla TypeScript** compiled directly to native browser ES modules (`type="module"`), requiring zero bundler overhead (no Vite, Webpack, or Rollup runtime wrappers) and ensuring predictable client debugging.

- **Configurable Room Turn Timer**: Host configures turn timer toggle and duration presets (30s, 45s default, 60s, 90s) in the Lobby; live updates propagate via SSE to all members; non-host cannot alter settings; disabled timer allows deliberate, untimed play with an explicit `⏱️ No Time Limit` indicator.
- **Authoritative Private Opponent Power**: Each player sees only their own Power reserve (`(Power/3) (Private)`); opponents' Power balances are hidden (`🔒 ?`) and completely omitted from network payloads (views, SSE streams, event projections, DOM, client storage).
- **Deliberate Player Choice (Zero Bluff Bias)**: Neither Bluff nor Genuine Attack is pre-selected.
- **Safety Lock**: The `Declare Strike` button remains disabled until the player deliberately chooses both a target and a commitment option.
- **Complete Thai & English Localization**: Defaults to natural Thai (`th`) with an instant language switcher (`ไทย | EN`) persisting across sessions. Zero page reload required to toggle. See [LOCALIZATION.md](LOCALIZATION.md).
- **Hidden Information Secrecy**: Private commitment data (`pendingFunding`) and opponent power are stripped server-side from views and SSE streams.
- **Real-Time State Synchronization**: SSE (`EventSource`) keeps all browser contexts instantly synchronized with live phase transitions, countdown timers, and resolution animations.
- **Seamless Rematch Flow**: Host can trigger `Play Again (Return to Lobby)` to transition all players back to the lobby with membership and room settings preserved for consecutive matches.

---

## 3. Quickstart & Local Multiplayer

### Requirements

- **Node.js**: `v22.x` (enforced via `.npmrc` and `engines`)
- **npm**: `v10.x+`

### Installation & Execution

```bash
# 1. Install dependencies
npm install

# 2. Build all packages and applications
npm run build

# 3. Start the application server
npm run start:server
```

Open `http://localhost:3000` in multiple browser tabs, windows, or devices on the same network.

- Player 1: Creates a room as Host and shares the 6-character room code.
- Players 2–4: Enter the code and their display names to take their seats.
- Host configures match settings (turn timer and duration) in the Lobby.
- Host clicks **⚔️ Start Match** (or **⚔️ เริ่มการประลอง**).

---

## 4. Verification & Testing Suite

Shadow Council enforces strict multi-layered verification gates across domain, application, HTTP transport, and actual browser automation:

```bash
# Run unit, scenario, and HTTP integration tests (Vitest)
npm test

# Run real browser end-to-end automation (Playwright)
npm run test:e2e

# Run TypeScript static type check across all workspaces
npm run typecheck

# Verify clean architecture boundaries and dependency acyclicity
npm run architecture:check

# Enforce physical file size budgets (hard limit 500 LOC per file)
npm run size:check

# Verify formatting
npm run format:check
```

### Real Browser E2E Automation (`tests/e2e/`)

- **`playtest-improvements.spec.ts`**: Verifies host turn timer configuration, live real-time SSE propagation to guests, guest edit prevention (read-only display), match launch with timer disabled displaying `No Time Limit` / `ไม่จำกัดเวลา`, full Thai localization of lobby settings and private power tags, and rematch preservation of room settings.
- **`hidden-information.spec.ts`**: Asserts that target and bystander DOM, innerHTML, textContent, and client storage contain zero traces of attacker funding commitments during pending strikes, and confirms opponent Power is strictly hidden (`🔒 ?`) across player panels and target select options.
- **`localization.spec.ts`**: Verifies default Thai visitor experience, full Thai gameplay journey (Lobby $\to$ Strike Bluff $\to$ Challenge $\to$ Reveal $\to$ Chronicle), seamless in-match language switcher toggle, and persistence across reloads.
- **`browser-journeys.spec.ts`**: Tests full user journeys using isolated Playwright browser contexts:
  - **Journey A**: Room creation, joining, lobby roster, and match launch.
  - **Journey B & C**: Combat resolution — Bluff Caught (attacker penalized) and Genuine Guard (both spend power, influence preserved).
  - **Journey D & E**: Full winner journey down to elimination, Result screen, final standings, and host rematch back to lobby.
  - **Journey F**: Mid-game reconnection and state preservation via browser page reload.

---

## 5. Playtest Protocol

For conducting structured 4-player playtest sessions, refer to the facilitator guide, metrics template, and debrief questions in [PLAYTEST.md](PLAYTEST.md).
