import type { TranslationDictionary } from "../types.js";

export const th: TranslationDictionary = {
  // Common
  "common.title": "สภาเงา",
  "common.subtitle": "เกมบลัฟและชิงไหวชิงพริบแห่งการลอบโจมตีที่ซ่อนเร้น",
  "common.rules": "📜 กติกา",
  "common.leave": "ออกจากห้อง",
  "common.you": "คุณ",
  "common.host": "หัวหน้าห้อง",
  "common.online": "ออนไลน์",
  "common.offline": "ออฟไลน์",
  "common.soundMute": "ปิดเสียง",
  "common.soundUnmute": "เปิดเสียง",
  "common.language": "ภาษา",

  // Home Screen
  "home.createTitle": "ก่อตั้งสภาเงา",
  "home.createDesc": "สร้างห้องประลองส่วนตัวในฐานะหัวหน้าห้อง แล้วแชร์รหัสห้องให้เพื่อน",
  "home.createNameLabel": "ชื่อของคุณ",
  "home.createNamePlaceholder": "เช่น เจ้าแห่งเงา คอร์วัส",
  "home.createButton": "สร้างห้อง",
  "home.creatingButton": "กำลังสร้างห้อง...",
  "home.joinTitle": "เข้าร่วมสภาเงา",
  "home.joinDesc": "กรอกรหัสห้องที่ได้รับจากหัวหน้าห้องเพื่อเข้าประจำที่นั่งของคุณ",
  "home.joinCodeLabel": "รหัสห้อง",
  "home.joinCodePlaceholder": "เช่น AB12CD",
  "home.joinNameLabel": "ชื่อของคุณ",
  "home.joinNamePlaceholder": "เช่น สตรีเร้นลับ เวสเพอรา",
  "home.joinButton": "เข้าร่วมห้อง",
  "home.joiningButton": "กำลังเข้าร่วม...",
  "home.quickSummaryTitle": "สรุปกติกาแบบรวดเร็ว",
  "home.quickBluffTitle": "บลัฟหรือโจมตีจริง",
  "home.quickBluffDesc":
    "ประกาศโจมตีเป้าหมาย ใช้ 1 พลังเพื่อฟันจริง หรือจ่าย 0 พลังเพื่อบลัฟหลอกศัตรู!",
  "home.quickReactionTitle": "การตอบโต้เชิงกลยุทธ์",
  "home.quickReactionDesc":
    "ผู้ถูกโจมตีเลือก ป้องกัน (1 พลัง), ท้าพิสูจน์การบลัฟ (ฟรี), หรือ ยอมจำนน (ฟรี, -1 อิทธิพล)",
  "home.quickSurvivorTitle": "ผู้อยู่รอดคนสุดท้าย",
  "home.quickSurvivorDesc":
    "เริ่มด้วย 3 อิทธิพล หากเหลือ 0 จะถูกกำจัด ผู้รอดชีวิตคนสุดท้ายจะครองสภาเงา!",

  // Lobby Screen
  "lobby.title": "ห้องล็อบบี้",
  "lobby.subtitle": "กำลังรวบรวมสมาชิกสภาเงา",
  "lobby.roomCodeLabel": "รหัสห้อง:",
  "lobby.copyCode": "📋 คัดลอกรหัส",
  "lobby.copiedCode": "✓ คัดลอกแล้ว!",
  "lobby.codeHint": "แชร์รหัสนี้ให้ผู้เล่นอื่น (รองรับ 2–6 คน) ต้องการอย่างน้อย 2 คนเพื่อเริ่มเกม",
  "lobby.rosterTitle": "สมาชิกที่เชื่อมต่อ ({count} / 6)",
  "lobby.waitingHost": "กำลังรอหัวหน้าห้องเริ่มการประลอง...",
  "lobby.waitingMinPlayers": "กำลังรอผู้เล่นอย่างน้อย 2 คน...",
  "lobby.startMatch": "⚔️ เริ่มการประลอง",
  "lobby.startingMatch": "กำลังเริ่มเกม...",
  "lobby.settingsTitle": "การตั้งค่าการประลอง",
  "lobby.timerLabel": "เวลาต่อเทิร์น:",
  "lobby.timerEnabled": "จำกัดเวลาต่อเทิร์น",
  "lobby.timerDisabled": "ไม่จำกัดเวลา",
  "lobby.timerDuration": "ระยะเวลาต่อเทิร์น:",
  "lobby.timerSeconds": "{seconds} วินาที",
  "lobby.noTimeLimit": "ไม่จำกัดเวลา",
  "lobby.settingsHostOnly": "เฉพาะหัวหน้าห้องเท่านั้นที่สามารถปรับแต่งการตั้งค่าได้",

  // Game Header & Conn
  "game.room": "ห้อง:",
  "game.round": "รอบที่",
  "game.connected": "● เชื่อมต่อแล้ว",
  "game.reconnecting": "◌ กำลังเชื่อมต่อใหม่...",
  "game.offline": "○ ออฟไลน์",
  "game.countdownRemaining": "เวลาที่เหลือ:",
  "game.noTimeLimit": "ไม่จำกัดเวลา",

  // Turn Indicators
  "game.turnYourTurn": "ตาของคุณ",
  "game.turnChooseAction": "เลือกการกระทำ: โจมตี หรือ ฟื้นพลัง",
  "game.turnChooseActionDesc":
    "ประกาศโจมตีคู่ต่อสู้ (บลัฟ หรือ โจมตีจริง) หรือเลือก ฟื้นพลัง 1 แต้ม",
  "game.turnWaitingFor": "กำลังรอ {player}...",
  "game.turnWaitingForDesc": "{player} กำลังตัดสินใจเลือกแผนการ",
  "game.turnUnderAttack": "ถูกจู่โจม",
  "game.turnAttackedBy": "{player} ประกาศโจมตีใส่คุณ!",
  "game.turnAttackedByDesc":
    "นี่คือการโจมตีจริงหรือแค่การบลัฟหลอก? เลือกการตอบโต้: ป้องกัน, ท้าพิสูจน์ หรือ ยอมจำนน",
  "game.turnThreatCommitted": "ลงมือโจมตีแล้ว",
  "game.turnThreatDeclaredAgainst": "ประกาศโจมตีใส่ {player}",
  "game.turnYouCommittedBluff":
    "คุณเลือก <strong>บลัฟ (ใช้ 0 พลัง)</strong> กำลังรอให้ {player} ตอบโต้...",
  "game.turnYouCommittedGenuine":
    "คุณเลือก <strong>โจมตีจริง (ใช้ 1 พลัง)</strong> กำลังรอให้ {player} ตอบโต้...",
  "game.turnClashInProgress": "การปะทะกำลังดำเนินอยู่",
  "game.turnClashHeadline": "{attacker} โจมตีใส่ {target}!",
  "game.turnClashWaitingReaction": "กำลังรอ {target} เลือกการป้องกัน",
  "game.turnFinishedVictory": "🏆 ชัยชนะเป็นของคุณ!",
  "game.turnFinishedWinner": "👑 {winner} คือผู้ชนะ!",
  "game.turnFinishedDesc": "สภาเงาล่มสลาย มีเพียงผู้รอดชีวิตเพียงหนึ่งเดียวที่ยืนหยัดในเงามืด",

  // Player Panel
  "player.aliveCount": "สภาเงา (เหลือรอด {count} คน)",
  "player.influenceLabel": "อิทธิพล (การอยู่รอด):",
  "player.influenceAria": "อิทธิพล {current} จาก 3",
  "player.powerLabel": "พลัง (พลังงาน):",
  "player.powerAria": "พลัง {current} จาก 3",
  "player.powerPrivate": "(ส่วนตัว)",
  "player.powerUnknownAria": "พลังของคู่ต่อสู้ถูกซ่อนไว้",
  "player.badgeActive": "กำลังเล่น",
  "player.badgeTarget": "เป้าหมาย",
  "player.badgeEliminated": "ถูกกำจัด",

  // Action Selector
  "action.title": "การกระทำของคุณ",
  "action.strikeTitle": "⚔️ ประกาศโจมตี",
  "action.strikeBadge": "บลัฟ หรือ โจมตีจริง",
  "action.strikeDesc":
    "เลือกคู่ต่อสู้ที่เป็นเป้าหมาย เลือกลับๆ ว่าจะใช้ 1 พลังเพื่อโจมตีจริง หรือบลัฟหลอกโดยไม่เสียพลัง",
  "action.chooseTarget": "เลือกเป้าหมาย:",
  "action.targetPlaceholder": "เลือกคู่ต่อสู้...",
  "action.secretCommitment": "การตัดสินใจลับ (ซ่อนจากผู้เล่นอื่น):",
  "action.bluffTitle": "🎭 บลัฟ (0 พลัง)",
  "action.bluffDesc":
    "ขู่ฟรี หากเป้าหมายยอมจำนนหรือป้องกันจะเสีย 1 อิทธิพล แต่ถ้าถูกท้าพิสูจน์ คุณจะเสีย 1 อิทธิพลเอง!",
  "action.genuineTitle": "🗡️ โจมตีจริง (1 พลัง)",
  "action.genuineDesc":
    "จ่าย 1 พลัง หากเป้าหมายท้าพิสูจน์ จะถูกลงทัณฑ์เสียถึง 2 อิทธิพล! ถูกบล็อกได้ด้วยการป้องกัน",
  "action.genuineDisabled": "ต้องการอย่างน้อย 1 พลัง (คุณมี 0 พลัง)",
  "action.declareStrike": "⚔️ ประกาศโจมตี",
  "action.declaringStrike": "กำลังส่งคำสั่งโจมตี...",
  "action.recoverTitle": "⚡ ฟื้นพลัง",
  "action.recoverBadge": "+1 พลัง",
  "action.recoverDesc":
    "สะสมกำลังในเงามืด เพิ่มพลังของคุณ 1 แต้ม (สูงสุด 3 แต้ม) และผ่านตาเดินอย่างปลอดภัย",
  "action.recoverBtn": "⚡ ฟื้นพลัง (+1)",
  "action.recoverBtnDisabled": "พลังเต็มขีดจำกัดแล้ว (3)",
  "action.recoveringBtn": "กำลังฟื้นพลัง...",

  // Reaction Panel
  "reaction.title": "คุณจะตอบโต้อย่างไร?",
  "reaction.hint": "คุณกำลังตกเป็นเป้าหมาย! อ่านทางคู่ต่อสู้แล้วเลือกท่าทีการป้องกันของคุณ:",
  "reaction.guardTitle": "ป้องกัน",
  "reaction.guardCost": "ใช้: 1 พลัง",
  "reaction.guardDesc":
    "เน้นปลอดภัย จ่าย 1 พลังเพื่อปัดป้องการโจมตีโดยสิ้นเชิง คุณจะไม่เสียอิทธิพลไม่ว่าการโจมตีนั้นจะเป็นการบลัฟหรือของจริง",
  "reaction.guardBtn": "🛡️ ป้องกัน (1 พลัง)",
  "reaction.guardBtnDisabled": "ต้องการ 1 พลัง",
  "reaction.guardBtnSubmitting": "กำลังล็อคการป้องกัน...",
  "reaction.challengeTitle": "ท้าพิสูจน์",
  "reaction.challengeCost": "ใช้: 0 พลัง",
  "reaction.challengeDesc":
    "จับไต๋การบลัฟ! หากคู่ต่อสู้บลัฟ <strong>พวกเขาจะเสีย 1 อิทธิพล</strong> แต่ถ้าเป็นของจริง <strong>คุณจะเสีย 2 อิทธิพล</strong>!",
  "reaction.challengeBtn": "👁️ ท้าพิสูจน์การบลัฟ",
  "reaction.challengeBtnSubmitting": "กำลังท้าพิสูจน์...",
  "reaction.yieldTitle": "ยอมจำนน",
  "reaction.yieldCost": "ใช้: 0 พลัง",
  "reaction.yieldDesc":
    "ยอมรับความสูญเสียเพื่อสงวนพลังงาน คุณไม่เสียพลัง แต่จะเสีย 1 อิทธิพลอย่างแน่นอน",
  "reaction.yieldBtn": "🏳️ ยอมจำนน (-1 อิทธิพล)",
  "reaction.yieldBtnSubmitting": "กำลังยอมจำนน...",

  // Reveal Panel
  "reveal.eyebrow": "ผลการปะทะ",
  "reveal.stepThreat": "1. ภัยคุกคาม",
  "reveal.stepThreatDesc": "<strong>{attacker}</strong> โจมตีใส่ <strong>{target}</strong>",
  "reveal.stepReaction": "2. การตอบโต้",
  "reveal.stepReactionDesc": "<strong>{target}</strong> เลือก <strong>{reaction}</strong>",
  "reveal.stepTruth": "3. ความจริงเปิดเผย",
  "reveal.valGenuine": "🗡️ โจมตีจริง (1 พลัง)",
  "reveal.valBluff": "🎭 บลัฟ (0 พลัง)",
  "reveal.eliminatedNotice": "☠️ {player} ถูกกำจัดแล้ว!",
  "reveal.attackBlockedTitle": "🛡️ ป้องกันการโจมตีสำเร็จ!",
  "reveal.attackBlockedSummary":
    "{attacker} โจมตีจริง แต่ {target} จ่าย 1 พลังป้องกันได้อย่างปลอดภัย ไม่มีใครสูญเสียอิทธิพล!",
  "reveal.bluffInducedGuardTitle": "🎭 การบลัฟบีบให้ป้องกัน!",
  "reveal.bluffInducedGuardSummary":
    "{attacker} แค่บลัฟหลอก! {target} เสีย 1 พลังไปกับการป้องกันภัยคุกคามที่ว่างเปล่า",
  "reveal.challengeCrushedTitle": "💥 การท้าพิสูจน์ถูกบดขยี้!",
  "reveal.challengeCrushedSummary":
    "การโจมตีของ {attacker} เป็นของจริง 100%! การท้าพิสูจน์ของ {target} ล้มเหลวและได้รับความเสียหายถึง 2 อิทธิพล!",
  "reveal.bluffCaughtTitle": "🚨 จับบลัฟได้!",
  "reveal.bluffCaughtSummary":
    "การบลัฟถูกเปิดโปง! {attacker} หลอกลวง การท้าพิสูจน์ของ {target} สำเร็จ! {attacker} เสีย 1 อิทธิพล!",
  "reveal.strikeLandedTitle": "🗡️ การโจมตีเข้าเป้า!",
  "reveal.strikeLandedSummary":
    "{target} ยอมจำนน{timedOut} ให้กับการโจมตีจริงของ {attacker} จึงเสีย 1 อิทธิพล",
  "reveal.bluffSucceededTitle": "🃏 การบลัฟสำเร็จ!",
  "reveal.bluffSucceededSummary":
    "{attacker} ขโมยแต้มอิทธิพลด้วยการบลัฟอย่างแนบเนียน! {target} ยอมจำนน{timedOut}",

  // Event Log
  "log.title": "📜 บันทึกเหตุการณ์ (ล่าสุด)",
  "log.actionCommitted":
    "⚔️ <strong>{attacker}</strong> ประกาศโจมตีใส่ <strong>{target}</strong> (การตัดสินใจซ่อนอยู่)",
  "log.reactionCommitted":
    "🛡️ <strong>{target}</strong> ล็อคการตอบโต้: <strong>{choice}</strong>{timeout}",
  "log.actionRevealed":
    "👁️ เปิดเผย: การโจมตีของ <strong>{attacker}</strong> คือ <strong>{truth}</strong>",
  "log.bluffSucceeded":
    "🃏 บลัฟสำเร็จ: <strong>{attacker}</strong> ชนะการบลัฟใส่ <strong>{target}</strong>!",
  "log.powerRecovered": "⚡ <strong>{player}</strong> ฟื้นฟู +1 พลัง",
  "log.turnPassed": "⌛ ตาของ <strong>{player}</strong> หมดเวลา (ผ่านตาเดิน)",
  "log.playerEliminated": "☠️ <strong>{player}</strong> ถูกกำจัดแล้ว!",
  "log.roundStarted": "🔄 เริ่มรอบที่ {round}",
  "log.victoryAchieved": "👑 <strong>{winner}</strong> ได้รับชัยชนะ!",
  "log.timeoutSuffix": " (เพราะหมดเวลา)",

  // Result Screen
  "result.subtitle": "การประลองสิ้นสุดลง · คำพิพากษาสุดท้าย",
  "result.victoryTitle": "ชัยชนะเป็นของคุณ!",
  "result.victoryDesc":
    "คุณบลัฟอย่างเหนือชั้น รอดพ้นทุกการจู่โจม และยืนหยัดในฐานะผู้มีอำนาจสูงสุดแห่งสภาเงา",
  "result.defeatTitle": "{winner} ได้รับชัยชนะ!",
  "result.defeatDesc": "{winner} กำจัดคู่แข่งทุกคนและขึ้นครองบัลลังก์แห่งสภาเงา",
  "result.standingsTitle": "อันดับผลการประลองสุดท้าย",
  "result.rankWinner": "👑 ผู้ชนะ",
  "result.rankEliminated": "☠️ ถูกกำจัด",
  "result.playAgain": "🔄 เล่นอีกครั้ง (กลับสู่ห้องล็อบบี้)",
  "result.resettingLobby": "กำลังรีเซ็ตกลับห้องล็อบบี้...",
  "result.waitingHostPlayAgain": "กำลังรอให้หัวหน้าห้องเริ่มเล่นอีกครั้ง...",

  // Rules Modal
  "rules.title": "📜 สภาเงา — กติกาใน 60 วินาที",
  "rules.closeAria": "ปิดหน้าต่างกติกา",
  "rules.goalTitle": "เป้าหมายของเกม",
  "rules.goalDesc":
    "คุณเริ่มต้นด้วย <strong>3 อิทธิพล</strong> และ <strong>2 พลัง</strong> หากอิทธิพลของคุณลดลงเหลือ 0 คุณจะถูกกำจัด <strong>ผู้เล่นคนสุดท้ายที่รอดชีวิตคือผู้ชนะ!</strong>",
  "rules.powerPrivacyRule":
    "🔒 <strong>พลังเป็นข้อมูลลับ:</strong> คุณจะมองเห็นเฉพาะพลังคงเหลือของตนเองเท่านั้น พลังของคู่ต่อสู้จะถูกซ่อนไว้",
  "rules.turnTitle": "ในตาของคุณ: เลือกการกระทำ",
  "rules.recoverRule": "เพิ่ม 1 พลัง (สูงสุด 3 แต้ม) และจบตาเดินของคุณ",
  "rules.strikeRule": "คุกคามคู่ต่อสู้ที่ยังรอดชีวิตหนึ่งคน เลือกระดับการลงมือลับๆ:",
  "rules.bluffSubRule":
    "ขู่ฟรี หากฝ่ายตรงข้ามยอมจำนนหรือป้องกัน จะสร้างความเสียหาย 1 อิทธิพล แต่ถ้าถูกท้าพิสูจน์ คุณจะเสีย 1 อิทธิพลเอง!",
  "rules.genuineSubRule":
    "ใช้ 1 พลัง หากฝ่ายตรงข้ามท้าพิสูจน์ พวกเขาจะถูกลงทัณฑ์สูญเสียถึง <strong>2 อิทธิพล</strong>!",
  "rules.reactionTitle": "เมื่อถูกโจมตี: การตอบโต้ของเป้าหมาย",
  "rules.reactionDesc": "การตัดสินใจของฝ่ายโจมตีจะเป็นความลับจนกว่าคุณจะตอบโต้ จงเลือกอย่างรอบคอบ:",
  "rules.tableHeaderReaction": "การตอบโต้",
  "rules.tableHeaderBluff": "หากผู้โจมตี บลัฟ (0 พลัง)",
  "rules.tableHeaderGenuine": "หากผู้โจมตี โจมตีจริง (1 พลัง)",
  "rules.tableGuardName": "🛡️ ป้องกัน",
  "rules.tableGuardCost": "(ใช้ 1 พลัง)",
  "rules.tableGuardBluff": "ปลอดภัยทั้งคู่ ผู้ถูกโจมตีเสีย 1 พลัง",
  "rules.tableGuardGenuine": "ปลอดภัยทั้งคู่ ทั้งสองฝ่ายเสียคนละ 1 พลัง",
  "rules.tableChallengeName": "👁️ ท้าพิสูจน์",
  "rules.tableChallengeCost": "(ฟรี)",
  "rules.tableChallengeBluff": "จับบลัฟได้! ผู้โจมตีเสีย 1 อิทธิพล ผู้ถูกโจมตีปลอดภัย",
  "rules.tableChallengeGenuine": "โดนสวนกลับ! ผู้ถูกโจมตีเสีย 2 อิทธิพล!",
  "rules.tableYieldName": "🏳️ ยอมจำนน",
  "rules.tableYieldCost": "(ฟรี)",
  "rules.tableYieldBluff": "ผู้ถูกโจมตีเสีย 1 อิทธิพล ผู้โจมตีเสีย 0 พลัง",
  "rules.tableYieldGenuine": "ผู้ถูกโจมตีเสีย 1 อิทธิพล ผู้โจมตีเสีย 1 พลัง",
  "rules.gotIt": "เข้าใจแล้ว เริ่มเล่นกันเลย",

  // Errors
  "error.generic": "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
  "error.RoomNotFound": "ไม่พบห้องประลองนี้",
  "error.MatchNotFound": "ไม่พบการประลองนี้",
  "error.NotMember": "คุณไม่ได้เป็นสมาชิกของห้องนี้",
  "error.NotHost": "เฉพาะหัวหน้าห้องเท่านั้นที่ทำรายการนี้ได้",
  "error.Unauthenticated": "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าร่วมห้องใหม่อีกครั้ง",
  "error.StaleRevision": "การกระทำถูกปฏิเสธเนื่องจากกระดานมีการอัปเดต กรุณาลองใหม่อีกครั้ง",
  "error.StalePhase": "สถานะการเล่นได้เปลี่ยนไปแล้ว กรุณาตรวจสอบกระดานปัจจุบัน",
  "error.CommandIdConflict": "คำสั่งซ้ำซ้อน ถูกปฏิเสธ",
  "error.InvalidIntent": "การกระทำไม่ถูกต้องตามสถานะเกมในปัจจุบัน",
  "error.InvalidDisplayName": "ชื่อที่ใช้แสดงไม่ถูกต้อง",
  "error.InvalidCommandId": "รหัสคำสั่งไม่ถูกต้อง",
  "error.InvalidSettings": "การตั้งค่าห้องไม่ถูกต้อง",
  "error.InternalError": "เซิร์ฟเวอร์เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
};
