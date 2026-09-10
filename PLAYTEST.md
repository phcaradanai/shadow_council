# Shadow Council: 4-Player Human Playtest Protocol

This document defines the official playtest protocol, facilitator procedure, observation guidelines, quantitative metrics sheet, and qualitative debrief questions for the first 4-player playtest of **Shadow Council**.

---

## 1. Playtest Objective

Validate that the core social bluff and concealed strike loop creates genuine tension, clear deductions, and decisive agency in a live 4-player multiplayer environment across actual web browsers.

**MVP Ruleset in Effect (Frozen)**:
- **Players**: 4 players in a single match room (2–6 supported).
- **Starting Stats**: 3 Influence (public), 2 Power per player (private).
- **Max Power**: 3 Power. Opponents' Power is hidden (`🔒 ?`); only own Power is visible.
- **Turn Timer**: Configurable in Lobby by host (Enabled: 30s, 45s default, 60s, 90s; or Disabled: No Time Limit).
- **Turn Actions**:
  - `Strike (Target, Funding)`: Funding = `0` (Bluff) or `1` (Genuine, requires $\ge 1$ Power).
  - `Recover`: $+1$ Power (capped at 3).
- **Reaction Phase** (Target only):
  - `Guard`: Costs 1 Power. Completely blocks the strike (0 Influence lost).
  - `Challenge`: Costs 0 Power. If attacker bluffed $\to$ Attacker loses 1 Influence. If genuine $\to$ Target loses 2 Influence.
  - `Yield`: Costs 0 Power. Target loses 1 Influence unconditionally.
- **Elimination**: Reaching 0 Influence eliminates the player.
- **Victory**: Sole surviving player wins the Council.

---

## 2. Facilitator Setup & Execution

### Prerequisites
1. Server running on the host machine or shared local network:
   ```bash
   npm run build
   npm run start:server
   ```
2. Port 3000 accessible to all 4 test devices (or 4 distinct browser profiles / windows on a workstation).

### Step-by-Step Procedure
1. **Host Setup**:
   - Player 1 navigates to `http://<host-ip>:3000`.
   - Enters display name (e.g. `Corvus`) and clicks **Create Room**.
   - Reads the generated 6-character room code (e.g. `KX92BA`).
2. **Participant Onboarding**:
   - Players 2, 3, and 4 navigate to `http://<host-ip>:3000`.
   - Enter the room code and their distinct display names.
   - Click **Join Room**.
3. **Lobby Confirmation & Match Settings**:
   - Confirm all 4 players appear in the lobby roster as **ONLINE**.
   - Host reviews the **⚙️ Match Settings** card in the Lobby:
     - Toggle turn timer (Enabled / Disabled).
     - Select turn duration (e.g. 45s for standard play, 60s/90s for relaxed play, or Disabled for untimed deliberate play).
     - Non-host players confirm settings update in real-time.
   - Facilitator announces: *"Review the 📜 Rules modal before we begin."*
   - Host clicks **⚔️ Start Match**.
4. **Active Play Observation**:
   - Facilitator observes the room without coaching.
   - Track actions and outcomes in the metrics sheet below.
5. **Post-Match Rematch**:
   - When the match concludes, observe the **Final Council Standings** screen.
   - Host clicks **🔄 Play Again (Return to Lobby)**.
   - Confirm all 4 players transition back to the lobby with seats and settings intact.
   - Host starts Match 2.

---

## 3. Quantitative Metrics Template

Record data for at least 2 consecutive 4-player matches:

| Metric | Match 1 | Match 2 | Target / Benchmark |
| :--- | :--- | :--- | :--- |
| **Match Duration** | `__ min` | `__ min` | 8 – 15 minutes |
| **Total Rounds Completed** | `__` | `__` | 3 – 8 rounds |
| **Total Strikes Declared** | `__` | `__` | $\ge 8$ per match |
| **Bluffs Declared (0 Power)** | `__` | `__` | 30% – 60% of strikes |
| **Genuine Attacks (1 Power)** | `__` | `__` | 40% – 70% of strikes |
| **Total Recovers Used** | `__` | `__` | 2 – 6 per match |
| **Reaction: Guard** | `__` | `__` | 20% – 40% of reactions |
| **Reaction: Challenge** | `__` | `__` | 30% – 50% of reactions |
| **Reaction: Yield** | `__` | `__` | 10% – 30% of reactions |
| **Successful Challenges (Bluff Caught)** | `__` | `__` | Record exact count |
| **Failed Challenges (Genuine Punished)** | `__` | `__` | Record exact count |
| **1st Elimination Round & Player** | `Round __ (____)` | `Round __ (____)` | Rounds 2 – 4 |
| **2nd Elimination Round & Player** | `Round __ (____)` | `Round __ (____)` | Rounds 3 – 6 |
| **3rd Elimination Round & Player** | `Round __ (____)` | `Round __ (____)` | Rounds 4 – 8 |
| **Winning Player** | `____` | `____` | Record victor name |
| **Disconnections / Reconnects** | `__` | `__` | 0 technical halts |

---

## 4. Qualitative Debrief Questions

Conduct this interview with all 4 participants immediately following Match 2:

### A. Core Bluff Tension & Strategy
1. *When you declared a strike, did you feel a genuine psychological thrill deciding between Bluff and Genuine?*
2. *When you were under attack, what cues or board state (power levels, past behavior, influence risk) guided your reaction?*
3. *Did the 2 Influence penalty for a failed Challenge feel appropriately dangerous, or did it paralyze challenges?*

### B. Hidden Information & Trust
4. *Did you ever feel uncertain whether your secret commitment was actually concealed from other players?*
5. *Did the reveal sequence clearly explain what happened and why someone lost influence or power?*

### C. UI Usability & Presentation
6. *Did you notice that the "Declare Strike" button required you to actively select both a target and a commitment? Did this prevent accidental mis-clicks?*
7. *Were the turn indicator, reaction controls, and countdown timer clear and readable under time pressure?*
8. *Did the audio cues (threat chord, challenge sting, victory chime) enhance the tension without being distracting?*

### D. Social Dynamics & Council Politics
9. *Did any table-talk or verbal deception occur naturally during the match?*
10. *Did you experience kingmaking or dogpiling on weakened players, and did the mechanics allow the weakened player any defensive counter-play?*
11. *Would you immediately want to play another rematch with the same group?*

---

## 5. Decision Gate for Alpha Release

The playtest is declared a **SUCCESS** and ready for broader alpha release if:
- [ ] Both matches complete without application crashes, frozen states, or SSE stream drops.
- [ ] Rematch flow successfully transitions all 4 players into Match 2 without browser refreshes.
- [ ] At least 1 bluff is caught and at least 1 genuine attack punishes a challenge across the session.
- [ ] All 4 players affirm that hidden commitments were completely confidential until reveal.
