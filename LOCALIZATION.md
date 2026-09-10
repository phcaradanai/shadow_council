# Shadow Council — Localization Architecture & Glossary

This document details the internationalization (i18n) and Thai localization system implemented for **Shadow Council**.

---

## 1. Architectural Principles

1. **Presentation Layer Isolation**:

   - Localization is strictly confined to the web client presentation layer (`apps/web/src/i18n/`).
   - The pure domain engine (`packages/domain`), application service (`packages/application`), and wire protocol (`packages/protocol`) remain completely language-neutral.
   - Machine identifiers (`STRIKE`, `RECOVER`, `GUARD`, `CHALLENGE`, `YIELD`), wire event types (`ActionCommitted`, `BluffCaught`, etc.), and API error codes (`RoomNotFound`, `StaleRevision`, etc.) never change.

2. **Strict Compile-Time Key Parity**:

   - All keys are defined in the `TranslationKey` union type in `apps/web/src/i18n/types.ts`.
   - Every locale dictionary implements `Record<TranslationKey, string>`.
   - Adding or removing a key requires updating all locale dictionaries simultaneously; otherwise, TypeScript compilation (`tsc`) fails immediately.

3. **Zero Hardcoded Strings in Components**:

   - All user-facing text is accessed via the typed helper `t("key.path", { params })`.
   - Dynamic parameters use `{token}` interpolation (e.g. `{attacker}`, `{target}`, `{count}`).
   - Error codes returned by the API are dynamically mapped to localized user-friendly messages via `getLocalizedErrorMessage(code, fallback)`.

4. **Default Thai Experience with Instant Switcher**:

   - New visitors default to Thai (`th`).
   - The UI includes a persistent language switcher (`ไทย | EN`) in the header across all screens.
   - Switching language updates `document.documentElement.lang`, persists the selection in `localStorage.getItem("shadow-council.locale")`, and re-renders the active screen immediately without reloading the page or disrupting gameplay.

5. **Cross-Platform Thai Typography**:

   - Clean typographic rendering without external Google Fonts or CDN dependencies.
   - Uses the native system font stack:
     ```css
     font-family: -apple-system, BlinkMacSystemFont, "Leelawadee UI", "Noto Sans Thai", "Thonburi",
       Tahoma, "Segoe UI", Roboto, sans-serif;
     ```
   - Enhanced line-height (`1.5`–`1.6`) ensures Thai tone marks (ไม้เอก, ไม้โท) and upper/lower vowels are never vertically clipped.

6. **Semantic Testing Attributes**:
   - Components output stable data attributes (`data-state`, `data-outcome`, `data-badge`, `data-stat`) to ensure automated test suites (e.g., Playwright E2E) remain resilient regardless of the active language.

---

## 2. Locked Terminology Glossary

The following translations have been established and applied uniformly across the client UI, rules modal, and chronicle logs:

| English Term            | Thai Translation          | Context & Rationale                                                                                                    |
| :---------------------- | :------------------------ | :--------------------------------------------------------------------------------------------------------------------- |
| **Shadow Council**      | **สภาเงา**                | Game title and central theme; evokes intrigue and hidden power.                                                        |
| **Influence**           | **อิทธิพล**               | Primary survival metric (3 pips). Eliminates player at 0. Label: _อิทธิพล (การอยู่รอด)_.                               |
| **Power**               | **พลัง**                  | Energy currency (max 3 pips). Spent on attacks and guards. Label: _พลัง (พลังงาน)_.                                    |
| **Strike**              | **ประกาศโจมตี**           | Active turn attack declaration against an opponent.                                                                    |
| **Bluff**               | **บลัฟ**                  | Faking a strike with 0 Power. Natural, recognizable Thai loanword in card/deduction games. Label: _บลัฟ (ใช้ 0 พลัง)_. |
| **Genuine Attack**      | **โจมตีจริง**             | Real strike backed by 1 Power. Label: _โจมตีจริง (ใช้ 1 พลัง)_.                                                        |
| **Guard**               | **ป้องกัน**               | Reaction: Spend 1 Power to safely block an attack.                                                                     |
| **Challenge**           | **ท้าพิสูจน์**            | Reaction: Call the attacker's bluff (costs 0 Power). Counter-attacks if genuine.                                       |
| **Yield**               | **ยอมจำนน**               | Reaction: Accept 1 Influence loss without spending energy.                                                             |
| **Under Attack**        | **ถูกจู่โจม**             | Urgent banner indicating the target must choose a reaction.                                                            |
| **Threat Committed**    | **ยืนยันการคุกคามแล้ว**   | Attacker status banner while waiting for the target's reaction.                                                        |
| **Clash in Progress**   | **กำลังเกิดการปะทะ**      | Bystander banner displaying an ongoing duel.                                                                           |
| **Attack Blocked**      | **ป้องกันการโจมตีสำเร็จ** | Reveal outcome when target successfully guards.                                                                        |
| **Bluff Caught**        | **จับบลัฟได้!**           | Reveal outcome when target successfully challenges a bluff.                                                            |
| **Challenge Crushed**   | **การท้าพิสูจน์ล้มเหลว!** | Reveal outcome when target challenges a genuine strike (takes 2 damage).                                               |
| **Bluff Succeeded**     | **บลัฟสำเร็จ!**           | Reveal outcome when attacker steals a point with 0 power.                                                              |
| **Strike Landed**       | **โจมตีเข้าเป้า!**        | Reveal outcome when target yields to a genuine strike.                                                                 |
| **Chronicle**           | **บันทึกเหตุการณ์**       | Event history log detailing recent round occurrences.                                                                  |
| **The Council (Alive)** | **สภาเงา (ผู้รอดชีวิต)**  | Roster header tracking living players.                                                                                 |
| **Host**                | **หัวหน้าห้อง**           | Room creator badge.                                                                                                    |
| **You**                 | **คุณ**                   | Self badge.                                                                                                            |
| **Match Settings**      | **การตั้งค่าการประลอง**   | Lobby settings card header for configuring game rules.                                                                 |
| **Turn Timer**          | **เวลาต่อเทิร์น**         | Toggle label for limited decision windows.                                                                             |
| **No Time Limit**       | **ไม่จำกัดเวลา**          | In-game countdown and lobby status when turn timer is disabled.                                                        |
| **(Private)**           | **(ส่วนตัว)**             | Badge on player's own power stat indicating only they can see it.                                                      |
| **Opponent power hidden** | **พลังของคู่ต่อสู้ถูกซ่อนไว้** | Accessibility label and tooltip for hidden opponent power indicator (`🔒 ?`).                                       |

---

## 3. How to Add a New Translation Key

When introducing a new UI element or message:

1. **Declare the key** in `apps/web/src/i18n/types.ts`:

   ```typescript
   export type TranslationKey =
     | ...
     | "newFeature.title"
     | "newFeature.description";
   ```

2. **Add English translation** in `apps/web/src/i18n/locales/en.ts`:

   ```typescript
   export const en: TranslationDictionary = {
     ...
     "newFeature.title": "Feature Title",
     "newFeature.description": "Description text for {player}.",
   };
   ```

3. **Add Thai translation** in `apps/web/src/i18n/locales/th.ts`:

   ```typescript
   export const th: TranslationDictionary = {
     ...
     "newFeature.title": "ชื่อฟีเจอร์",
     "newFeature.description": "ข้อความอธิบายสำหรับ {player}",
   };
   ```

4. **Verify TypeScript compilation**:

   ```bash
   npm run typecheck
   ```

   If either dictionary omits the key, the build will error immediately.

5. **Consume in component**:

   ```typescript
   import { t } from "../i18n";

   const html = `<h2>${t("newFeature.title")}</h2>`;
   ```

---

## 4. Verification

The localization system is verified by:

- **Unit Tests**: `apps/web/src/i18n/i18n.test.ts` (dictionary key parity, fallback behavior, interpolation, reactive subscribers).
- **End-to-End Tests**: `tests/e2e/localization.spec.ts` (Thai default detection, full Thai gameplay journey, dynamic switching without interruption, and reload persistence).
