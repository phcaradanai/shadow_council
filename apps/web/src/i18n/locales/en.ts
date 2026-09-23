import type { TranslationDictionary } from "../types.js";

export const en: TranslationDictionary = {
  // Common
  "common.title": "SHADOW COUNCIL",
  "common.subtitle": "A Social Bluff & Deduction Game of Concealed Strikes",
  "common.rules": "📜 Rules",
  "common.leave": "Leave Room",
  "common.you": "YOU",
  "common.host": "HOST",
  "common.online": "ONLINE",
  "common.offline": "OFFLINE",
  "common.soundMute": "Mute sound",
  "common.soundUnmute": "Unmute sound",
  "common.language": "Language",

  // Home Screen
  "home.createTitle": "Create a Council",
  "home.createDesc": "Start a new private match room as host. Share the room code with friends.",
  "home.createNameLabel": "Your Display Name",
  "home.createNamePlaceholder": "e.g. Master Corvus",
  "home.createButton": "Create Room",
  "home.creatingButton": "Creating...",
  "home.joinTitle": "Join a Council",
  "home.joinDesc": "Enter a room code provided by your match host to take your seat.",
  "home.joinCodeLabel": "Room Code",
  "home.joinCodePlaceholder": "e.g. AB12CD",
  "home.joinNameLabel": "Your Display Name",
  "home.joinNamePlaceholder": "e.g. Lady Vespera",
  "home.joinButton": "Join Room",
  "home.joiningButton": "Joining...",
  "home.quickSummaryTitle": "Quick Summary",
  "home.quickBluffTitle": "Threat & Force",
  "home.quickBluffDesc":
    "Declare Threat (1-3) and secretly commit Force from 0 up to that Threat. Force = Threat is fully backed; anything lower is a bluff.",
  "home.quickReactionTitle": "Tactical Reactions",
  "home.quickReactionDesc":
    "Build a defense plan: choose Guard 0-3 and optionally spend 1 Power to Challenge. You can combine Guard + Challenge.",
  "home.quickSurvivorTitle": "Last One Standing",
  "home.quickSurvivorDesc":
    "Start with 3 Influence. Zero influence eliminates you. Sole survivor takes the Council!",
  "home.tagline": "Trust no one. Outwit the Council.",
  "home.tabCreate": "Assemble Council",
  "home.tabJoin": "Take Your Seat",

  // Lobby Screen
  "lobby.title": "LOBBY",
  "lobby.subtitle": "Assembling the Shadow Council",
  "lobby.roomCodeLabel": "Room Code:",
  "lobby.copyCode": "📋 Copy Code",
  "lobby.copiedCode": "✓ Copied!",
  "lobby.codeHint":
    "Share this code with other players (2–6 players supported). Need at least 2 players to begin.",
  "lobby.rosterTitle": "Connected Members ({count} / 6)",
  "lobby.waitingHost": "Waiting for the host to begin the match...",
  "lobby.waitingMinPlayers": "Waiting for at least 2 connected players...",
  "lobby.startMatch": "⚔️ Start Match",
  "lobby.startingMatch": "Starting Match...",
  "lobby.addBot": "Add Bot Agent",
  "lobby.addingBot": "Adding Bot...",
  "lobby.botEasy": "Easy",
  "lobby.botMedium": "Medium",
  "lobby.botHard": "Hard",
  "lobby.botDifficulty": "Bot Difficulty",
  "lobby.settingsTitle": "Match Settings",
  "lobby.timerLabel": "Turn Timer:",
  "lobby.timerEnabled": "Turn Timer Enabled",
  "lobby.timerDisabled": "No Time Limit",
  "lobby.timerDuration": "Turn Duration:",
  "lobby.timerSeconds": "{seconds}s",
  "lobby.noTimeLimit": "No Time Limit",
  "lobby.settingsHostOnly": "Only the host can modify room settings.",

  // Game Header & Conn
  "game.room": "Room:",
  "game.round": "Round",
  "game.stats": "Stats",
  "game.connected": "● Connected",
  "game.reconnecting": "◌ Reconnecting...",
  "game.offline": "○ Offline",
  "game.countdownRemaining": "Time remaining:",
  "game.noTimeLimit": "No Time Limit",

  // Turn Indicators
  "game.turnYourTurn": "YOUR TURN",
  "game.turnChooseAction": "Choose an Action: Strike, Scheme, or Recover",
  "game.turnChooseActionDesc":
    "Declare a Strike with public Threat & hidden Force, set a secret Scheme, or Recover +2 Power.",
  "game.turnWaitingFor": "Waiting for {player}...",
  "game.turnWaitingForDesc": "{player} is contemplating their move.",
  "game.turnUnderAttack": "UNDER ATTACK",
  "game.turnAttackedBy": "{player} has declared Threat {threat} on YOU!",
  "game.turnAttackedByDesc":
    "Their Force is hidden. Build a Defense Plan: choose Guard, then decide whether to spend 1 Power to Challenge.",
  "game.turnThreatCommitted": "THREAT COMMITTED",
  "game.turnThreatDeclaredAgainst": "Threat {threat} declared against {player}",
  "game.turnYouCommittedBluff":
    "You declared Threat {threat} with <strong>BLUFF (Force {force})</strong>. Waiting for {player} to react...",
  "game.turnYouCommittedGenuine":
    "You declared Threat {threat} with <strong>GENUINE FORCE ({force} Power)</strong>. Waiting for {player} to react...",
  "game.turnClashInProgress": "CLASH IN PROGRESS",
  "game.turnClashHeadline": "{attacker} declared Threat {threat} at {target}!",
  "game.turnClashWaitingReaction": "Waiting for {target} to choose their defense.",
  "game.turnFinishedVictory": "🏆 VICTORY IS YOURS!",
  "game.turnFinishedWinner": "👑 {winner} HAS WON!",
  "game.turnFinishedDesc": "The Council has fallen. Only one survivor remains in the shadows.",

  // Player Panel
  "player.aliveCount": "The Council ({count} Alive)",
  "player.influenceLabel": "Influence (Survival):",
  "player.influenceAria": "{current} of 3 influence",
  "player.powerLabel": "Power (Energy):",
  "player.powerAria": "{current} of 3 power",
  "player.powerPrivate": "(Private)",
  "player.powerUnknownAria": "Opponent power is hidden",
  "player.schemeActive": "SCHEME READY",
  "player.schemeAmbush": "Ambush Ready",
  "player.schemeBulwark": "Bulwark Ready",
  "player.schemeHidden": "Scheme Prepared",
  "player.badgeActive": "ACTIVE",
  "player.badgeTarget": "TARGET",
  "player.badgeEliminated": "ELIMINATED",
  "player.targetPrompt": "🎯 Click to Target",
  "player.selectedTarget": "🎯 Target Locked",

  // Action Selector
  "action.title": "Your Action",
  "action.targetHint": "Select an opponent from the Council Table above or the list below:",
  "action.strikeTitle": "⚔️ Claim a Strike",
  "action.strikeBadge": "Threat & Force",
  "action.strikeDesc":
    "Choose an opponent to threaten. Declare a public Threat (1-3) and back it with private Force (0-3).",
  "action.threatLabel": "Public Threat Level (Damage claimed):",
  "action.threatDesc":
    "This is your public claim. Actual Force stays hidden and can never exceed the declared Threat.",
  "action.forceLabel": "Secret Force (Power committed):",
  "action.forceDesc":
    "Force = Threat is fully backed. Force < Threat is underfunded and counts as a bluff.",
  "action.chooseTarget": "Choose Target:",
  "action.targetPlaceholder": "Select an opponent...",
  "action.secretCommitment": "Secret Force Commitment:",
  "action.bluffTitle": "🎭 Bluff (Force < Threat)",
  "action.bluffDesc":
    "Costs less Power. If target yields or guards, you sneak in damage! But if Challenged, YOU lose Influence!",
  "action.genuineTitle": "🗡️ Fully Backed (Force = Threat)",
  "action.genuineDesc":
    "Costs Power equal to Force. If a fully backed Strike is Challenged, the base failed-call danger is 2 Influence.",
  "action.genuineDisabled": "Insufficient Power for selected Force.",
  "action.declareStrike": "⚔️ Declare Strike",
  "action.declaringStrike": "Committing Strike...",
  "action.recoverTitle": "⚡ Recover Power",
  "action.recoverBadge": "+2 Power",
  "action.recoverDesc":
    "Gather your resources in the shadows. Increases your Power by 2 (up to 3 max) and passes your turn.",
  "action.recoverBtn": "⚡ Recover Power (+2)",
  "action.recoverBtnDisabled": "Power at Maximum (3)",
  "action.recoveringBtn": "Recovering...",
  "action.schemeTitle": "♟️ Prepare Scheme",
  "action.schemeBadge": "1 Power",
  "action.schemeDesc":
    "Spend 1 Power to arm one hidden contingency. Preparing another Scheme replaces the current one; opponents only know that one is armed.",
  "action.schemeAmbushTitle": "🗡️ Ambush",
  "action.schemeAmbushDesc":
    "When you catch an opponent bluffing via Challenge, deal +1 bonus damage to the attacker!",
  "action.schemeBulwarkTitle": "🛡️ Bulwark",
  "action.schemeBulwarkDesc":
    "When you commit Guard, Bulwark adds +1 effective Guard. It does nothing on Yield or a pure Challenge.",
  "action.schemeBtn": "♟️ Prepare Scheme",
  "action.schemeBtnDisabled": "Requires 1 Power",
  "action.schemingBtn": "Preparing Scheme...",
  "action.turnEyebrow": "Council move",
  "action.strikePlannerHint":
    "Your main move is a wager: make the public claim, then decide how much private Power really backs it.",
  "action.powerAvailable": "{power} Power",
  "action.threatOption": "Threat {threat}",
  "action.claimPressure": "Public pressure {threat}",
  "action.forceZero": "No Force",
  "action.forceValue": "Force {force}",
  "action.forceCost": "Costs {force} Power",
  "action.planTitle": "Locked story",
  "action.planTarget": "Target",
  "action.planClaim": "Public Threat",
  "action.planSecret": "Private Force",
  "action.planRemaining": "Power after commit",
  "action.planAwaiting": "Build the claim",
  "action.planHint":
    "Pick a target, public Threat, and secret Force. The defender only sees your Threat.",
  "action.stylePureBluff": "🎭 Pure Bluff",
  "action.stylePartialBluff": "🌓 Partial Bluff",
  "action.styleFullyBacked": "⚔ Fully Backed",
  "action.readPureBluff":
    "You spend no Power. If they Challenge, the bluff is exposed; if they hesitate, the claim still creates pressure.",
  "action.readPartialBluff":
    "You are claiming Threat {threat} with only Force {force}. Cheaper pressure, but a Challenge catches the gap.",
  "action.readFullyBacked":
    "Force matches Threat {threat}. Expensive, but a wrong Challenge is dangerous for the defender.",

  // Reaction Panel
  "reaction.title": "How Do You Respond?",
  "reaction.hint": "You are being targeted! Read your opponent and choose your defensive stance:",
  "reaction.threatIncoming": "Incoming Threat: {threat}",
  "reaction.guardTitle": "Guard",
  "reaction.guardCost": "Cost: 1-3 Power",
  "reaction.guardDesc":
    "Spend G Power (1-3) to absorb G damage from the attacker's committed Force. If Bulwark is active, absorbs +1 damage.",
  "reaction.guardBtn": "🛡️ Guard",
  "reaction.guardAmountLabel": "Guard Amount (Power to spend):",
  "reaction.guardBtnDisabled": "Requires Power",
  "reaction.guardBtnSubmitting": "Locking Guard...",
  "reaction.challengeTitle": "Challenge",
  "reaction.challengeCost": "Cost: 1 Power",
  "reaction.challengeDesc":
    "Spend 1 Power to call an underfunded claim. If Force < Threat, the attacker loses Influence. If Force = Threat, the base danger is 2 Influence; committed Guard can reduce it.",
  "reaction.challengeBtn": "👁️ Challenge Bluff",
  "reaction.challengeBtnSubmitting": "Locking Challenge...",
  "reaction.yieldTitle": "Yield",
  "reaction.yieldCost": "Cost: 0 Power",
  "reaction.yieldDesc":
    "Accept a controlled loss without spending Power: lose exactly 1 Influence.",
  "reaction.yieldBtn": "🏳️ Yield",
  "reaction.yieldBtnSubmitting": "Yielding...",
  "reaction.incomingClaim": "Incoming claim",
  "reaction.hiddenForceRange": "Actual Force is hidden. It can be {values}.",
  "reaction.powerAvailable": "Your private Power",
  "reaction.guardPlannerDesc": "Choose how much Power to reserve as physical defense.",
  "reaction.noGuard": "No Guard",
  "reaction.noGuardDesc": "Spend no defensive Power.",
  "reaction.guardPoints": "Guard {amount}",
  "reaction.guardPointsDesc": "Commit {amount} Power to absorb Force.",
  "reaction.challengePlannerTitle": "Call the bluff · {cost} Power",
  "reaction.challengePlannerDesc": "You are claiming their Force is below Threat {threat}.",
  "reaction.planTitle": "Defense plan",
  "reaction.totalCost": "Total Power",
  "reaction.selectDefense": "Choose your defense",
  "reaction.selectDefenseHint":
    "Select a Guard amount first. You may add Challenge to hedge the read.",
  "reaction.lockPlan": "Lock Defense",
  "reaction.lockingPlan": "Locking Defense...",
  "reaction.modeYield": "Yield",
  "reaction.modeGuard": "Guard {guard}",
  "reaction.modeChallenge": "Challenge",
  "reaction.modeHybrid": "Guard {guard} + Challenge",
  "reaction.previewYield": "Guaranteed controlled loss: your Influence would become {influence}.",
  "reaction.previewGuard": "Your Guard can absorb up to {guard} actual Force.",
  "reaction.previewBluffCaught": "If underfunded: Challenge succeeds and the attacker is punished.",
  "reaction.previewChallengeWrong":
    "If fully backed: you take {damage} Influence damage → {influence} remaining.",
  "reaction.previewHybridWrong":
    "If fully backed: Guard {guard} cushions the failed call to {damage} damage → {influence} remaining.",
  "reaction.planTooExpensive": "This combination costs more Power than you have.",

  // Reveal Panel
  "reveal.eyebrow": "Clash Resolution",
  "reveal.stepThreat": "1. Threat",
  "reveal.stepThreatDesc":
    "<strong>{attacker}</strong> declared Threat {threat} at <strong>{target}</strong>",
  "reveal.stepReaction": "2. Reaction",
  "reveal.stepReactionDesc": "<strong>{target}</strong> chose <strong>{reaction}</strong>",
  "reveal.stepTruth": "3. Truth Revealed",
  "reveal.valGenuine": "🗡️ GENUINE (Force {force})",
  "reveal.valBluff": "🎭 BLUFF (Force {force} < Threat {threat})",
  "reveal.eliminatedNotice": "☠️ {player} has been ELIMINATED!",
  "reveal.attackBlockedTitle": "🛡️ ATTACK BLOCKED!",
  "reveal.attackBlockedSummary":
    "{attacker} attacked with Force {force}, but {target} defended safely. Neither lost Influence!",
  "reveal.bluffInducedGuardTitle": "🎭 BLUFF INDUCED GUARD!",
  "reveal.bluffInducedGuardSummary":
    "{attacker} was bluffing! {target} spent Power guarding against an inflated Threat.",
  "reveal.challengeCrushedTitle": "💥 CHALLENGE CRUSHED!",
  "reveal.challengeCrushedSummary":
    "{attacker}'s Strike was GENUINE (Force {force} >= Threat {threat})! {target} challenged in vain and suffers heavy damage!",
  "reveal.bluffCaughtTitle": "🚨 BLUFF CAUGHT!",
  "reveal.bluffCaughtSummary":
    "BLUFF EXPOSED! {attacker} committed Force {force} for Threat {threat}. {target}'s challenge succeeded! {attacker} loses Influence!",
  "reveal.strikeLandedTitle": "🗡️ STRIKE LANDED!",
  "reveal.strikeLandedSummary": "{target} yielded {timedOut} to {attacker}'s Strike.",
  "reveal.bluffSucceededTitle": "🃏 BLUFF SUCCEEDED!",
  "reveal.bluffSucceededSummary":
    "{attacker} forced concessions with a pure bluff! {target} yielded {timedOut}.",
  "reveal.schemeTriggered": "♟️ Scheme Triggered: {scheme}!",
  "reveal.bulwarkAbsorbed": "🛡️ Bulwark absorbed 1 damage!",
  "reveal.ambushRetaliated": "🗡️ Ambush dealt +1 bonus damage to attacker!",
  "reveal.damageResult": "Influence lost: {damage} · Remaining: {remaining}",
  "reveal.powerSpent": "Defense Power spent: {power}",
  "reveal.attackerPowerSpent": "Attacker Force spent: {power}",
  "reveal.attackerDamageResult": "{attacker} lost {damage} Influence · {remaining} remaining",
  "reveal.guardHeldTitle": "🛡️ GUARD HELD!",
  "reveal.guardHeldSummary":
    "{target} committed Guard {guard} against Force {force} and stopped the strike.",
  "reveal.guardBreachedTitle": "⚔️ GUARD BREACHED!",
  "reveal.guardBreachedSummary":
    "Force {force} exceeded {target}'s Guard {guard}. {target} loses {damage} Influence.",
  "reveal.challengeGuardedTitle": "🛡️ WRONG CALL — GUARD SAVED YOU",
  "reveal.challengeGuardedSummary":
    "{target}'s Challenge was wrong, but committed Guard {guard} absorbed the full penalty.",

  // Event Log
  "log.title": "📜 Chronicle (Recent Events)",
  "log.collapse": "Hide Chronicle",
  "log.expand": "View Chronicle",
  "log.latest": "Latest",
  "log.actionCommitted":
    "⚔️ <strong>{attacker}</strong> declared Threat {threat} on <strong>{target}</strong> (Force hidden).",
  "log.reactionCommitted":
    "🛡️ <strong>{target}</strong> locked reaction: <strong>{choice}</strong>{timeout}.",
  "log.actionRevealed":
    "👁️ Reveal: <strong>{attacker}</strong>'s Force was <strong>{truth}</strong>.",
  "log.bluffSucceeded":
    "🃏 Bluff succeeded: <strong>{attacker}</strong> won the bluff against <strong>{target}</strong>!",
  "log.powerRecovered": "⚡ <strong>{player}</strong> recovered +{powerGained} Power.",
  "log.schemePrepared": "♟️ <strong>{player}</strong> prepared a Scheme.",
  "log.turnPassed": "⌛ <strong>{player}</strong>'s turn timed out (passed).",
  "log.playerEliminated": "☠️ <strong>{player}</strong> has been eliminated!",
  "log.roundStarted": "🔄 Round {round} began.",
  "log.victoryAchieved": "👑 <strong>{winner}</strong> has achieved victory!",
  "log.timeoutSuffix": " (by timeout)",

  // Result Screen
  "result.subtitle": "Match Concluded · Final Decree",
  "result.victoryTitle": "VICTORY IS YOURS!",
  "result.victoryDesc":
    "You out-bluffed, survived every strike, and stand as the supreme authority.",
  "result.defeatTitle": "{winner} PREVAILS!",
  "result.defeatDesc":
    "{winner} eliminated all rivals and claimed the throne of the Shadow Council.",
  "result.standingsTitle": "Final Council Standings",
  "result.rankWinner": "👑 WINNER",
  "result.rankEliminated": "☠️ ELIMINATED",
  "result.playAgain": "🔄 Play Again (Return to Lobby)",
  "result.resettingLobby": "Resetting to Lobby...",
  "result.waitingHostPlayAgain": "Waiting for host to initiate Play Again...",

  // Rules Modal
  "rules.title": "📜 Shadow Council — Rules in 60 Seconds",
  "rules.closeAria": "Close rules",
  "rules.goalTitle": "Goal of the Game",
  "rules.goalDesc":
    "You begin with <strong>3 Influence</strong> and <strong>2 Power</strong>. If your Influence drops to 0, you are eliminated. <strong>The last surviving player wins!</strong>",
  "rules.powerPrivacyRule":
    "🔒 <strong>Power is Private:</strong> You can only see your own Power reserves. Opponent Power is hidden.",
  "rules.turnTitle": "On Your Turn: Choose an Action",
  "rules.recoverRule":
    "⚡ <strong>Recover:</strong> Gain +2 Power (up to 3 max) and end your turn.",
  "rules.schemeRule":
    "♟️ <strong>Scheme (1 Power):</strong> Arm Ambush (+1 attacker damage on a successful Challenge) or Bulwark (+1 Guard when Guard is committed). Opponents know a Scheme is armed, but not which one.",
  "rules.strikeRule":
    "⚔️ <strong>Strike:</strong> Choose a target, announce Threat (1-3), and secretly commit Force (0-3).",
  "rules.bluffSubRule":
    "Force < Threat is a Bluff. If challenged, attacker takes 1 damage (plus Ambush).",
  "rules.genuineSubRule":
    "Force = Threat is fully backed. A failed Challenge has fixed base danger 2, which Guard can mitigate.",
  "rules.reactionTitle": "Under Attack: Target's Reaction",
  "rules.reactionDesc":
    "Force stays secret until you lock a Defense Plan. Choose Guard 0-3 and optionally add a 1-Power Challenge; the two may be combined.",
  "rules.tableHeaderReaction": "Reaction",
  "rules.tableHeaderBluff": "If Bluff (Force < Threat)",
  "rules.tableHeaderGenuine": "If Fully Backed (Force = Threat)",
  "rules.tableGuardName": "🛡️ Guard (1-3 Power)",
  "rules.tableGuardCost": "(Costs 1-3 Power)",
  "rules.tableGuardBluff": "Absorbs Guard damage. Force wasted.",
  "rules.tableGuardGenuine": "Target takes max(0, Force - Guard). Bulwark adds +1 defense.",
  "rules.tableChallengeName": "👁️ Challenge",
  "rules.tableChallengeCost": "(1 Power)",
  "rules.tableChallengeBluff": "Bluff Caught! Attacker loses 1 Influence (+1 if Ambush).",
  "rules.tableChallengeGenuine":
    "Challenge fails: base 2 Influence danger. Guard in a hybrid plan reduces it.",
  "rules.tableYieldName": "🏳️ Yield",
  "rules.tableYieldCost": "(Free)",
  "rules.tableYieldBluff": "Controlled loss: target loses exactly 1 Influence.",
  "rules.tableYieldGenuine": "Controlled loss: target loses exactly 1 Influence.",
  "rules.gotIt": "Got it, let's play",

  // Errors
  "error.generic": "Something went wrong. Please try again.",
  "error.RoomNotFound": "Room not found.",
  "error.MatchNotFound": "Match not found.",
  "error.NotMember": "You are not a member of this room.",
  "error.NotHost": "Only the room host can perform this action.",
  "error.Unauthenticated": "Session expired or unauthenticated. Please re-join.",
  "error.StaleRevision": "Action rejected due to state update. Please try again.",
  "error.StalePhase": "The match phase has changed. Please review the current board.",
  "error.CommandIdConflict": "Duplicate command rejected.",
  "error.InvalidIntent": "Action is not valid in the current game state.",
  "error.InvalidDisplayName": "Display name is invalid.",
  "error.InvalidCommandId": "Command ID format is invalid.",
  "error.InvalidSettings": "Invalid room settings.",
  "error.InternalError": "The server encountered an error. Please try again.",
};
