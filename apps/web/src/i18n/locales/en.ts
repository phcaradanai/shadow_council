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
  "home.quickBluffTitle": "Bluff or Attack",
  "home.quickBluffDesc":
    "Declare a Strike against an opponent. Spend 1 Power on a genuine blow, or pay 0 to bluff!",
  "home.quickReactionTitle": "Tactical Reactions",
  "home.quickReactionDesc":
    "Target can Guard (1 Power), Challenge the bluff (free), or Yield (free, -1 Inf).",
  "home.quickSurvivorTitle": "Last One Standing",
  "home.quickSurvivorDesc":
    "Start with 3 Influence. Zero influence eliminates you. Sole survivor takes the Council!",

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

  // Game Header & Conn
  "game.room": "Room:",
  "game.round": "Round",
  "game.connected": "● Connected",
  "game.reconnecting": "◌ Reconnecting...",
  "game.offline": "○ Offline",
  "game.countdownRemaining": "Time remaining:",

  // Turn Indicators
  "game.turnYourTurn": "YOUR TURN",
  "game.turnChooseAction": "Choose an Action: Strike or Recover",
  "game.turnChooseActionDesc":
    "Claim a Strike against an opponent (Genuine or Bluff), or Recover 1 Power.",
  "game.turnWaitingFor": "Waiting for {player}...",
  "game.turnWaitingForDesc": "{player} is contemplating their move.",
  "game.turnUnderAttack": "UNDER ATTACK",
  "game.turnAttackedBy": "{player} has declared a Strike on YOU!",
  "game.turnAttackedByDesc":
    "Is it a genuine strike or a daring bluff? Choose your reaction: Guard, Challenge, or Yield.",
  "game.turnThreatCommitted": "THREAT COMMITTED",
  "game.turnThreatDeclaredAgainst": "Strike declared against {player}",
  "game.turnYouCommittedBluff":
    "You committed a <strong>BLUFF (0 Power)</strong>. Waiting for {player} to react...",
  "game.turnYouCommittedGenuine":
    "You committed a <strong>GENUINE ATTACK (1 Power)</strong>. Waiting for {player} to react...",
  "game.turnClashInProgress": "CLASH IN PROGRESS",
  "game.turnClashHeadline": "{attacker} struck at {target}!",
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
  "player.badgeActive": "ACTIVE",
  "player.badgeTarget": "TARGET",
  "player.badgeEliminated": "ELIMINATED",

  // Action Selector
  "action.title": "Your Action",
  "action.strikeTitle": "⚔️ Claim a Strike",
  "action.strikeBadge": "Bluff or Attack",
  "action.strikeDesc":
    "Choose an opponent to threaten. Privately decide whether to spend 1 Power on a genuine blow or bluff for free.",
  "action.chooseTarget": "Choose Target:",
  "action.targetPlaceholder": "Select an opponent...",
  "action.secretCommitment": "Secret Commitment (Concealed from others):",
  "action.bluffTitle": "🎭 Bluff (0 Power)",
  "action.bluffDesc":
    "Free threat. Deals 1 Influence if they yield or guard. If Challenged, YOU lose 1 Influence!",
  "action.genuineTitle": "🗡️ Genuine Attack (1 Power)",
  "action.genuineDesc":
    "Costs 1 Power. Punishes a Challenge with 2 Influence loss! Blocked by Guard.",
  "action.genuineDisabled": "Requires at least 1 Power (You have 0).",
  "action.declareStrike": "⚔️ Declare Strike",
  "action.declaringStrike": "Committing Strike...",
  "action.recoverTitle": "⚡ Recover Power",
  "action.recoverBadge": "+1 Power",
  "action.recoverDesc":
    "Gather your resources in the shadows. Increases your Power by 1 (up to 3 max) and passes your turn safely.",
  "action.recoverBtn": "⚡ Recover Power (+1)",
  "action.recoverBtnDisabled": "Power at Maximum (3)",
  "action.recoveringBtn": "Recovering...",

  // Reaction Panel
  "reaction.title": "How Do You Respond?",
  "reaction.hint": "You are being targeted! Read your opponent and choose your defensive stance:",
  "reaction.guardTitle": "Guard",
  "reaction.guardCost": "Cost: 1 Power",
  "reaction.guardDesc":
    "Play it safe. Spend 1 Power to deflect the strike completely. You lose 0 Influence regardless of whether the strike was genuine or a bluff.",
  "reaction.guardBtn": "🛡️ Guard (1 Power)",
  "reaction.guardBtnDisabled": "Requires 1 Power",
  "reaction.guardBtnSubmitting": "Locking Guard...",
  "reaction.challengeTitle": "Challenge",
  "reaction.challengeCost": "Cost: 0 Power",
  "reaction.challengeDesc":
    "Call their bluff! If they bluffed, <strong>THEY lose 1 Influence</strong>. But if the strike was genuine, <strong>YOU lose 2 Influence</strong>!",
  "reaction.challengeBtn": "👁️ Challenge Bluff",
  "reaction.challengeBtnSubmitting": "Locking Challenge...",
  "reaction.yieldTitle": "Yield",
  "reaction.yieldCost": "Cost: 0 Power",
  "reaction.yieldDesc":
    "Accept the loss to preserve your resources. You spend no Power, but you lose 1 Influence unconditionally.",
  "reaction.yieldBtn": "🏳️ Yield (-1 Inf)",
  "reaction.yieldBtnSubmitting": "Yielding...",

  // Reveal Panel
  "reveal.eyebrow": "Clash Resolution",
  "reveal.stepThreat": "1. Threat",
  "reveal.stepThreatDesc": "<strong>{attacker}</strong> struck at <strong>{target}</strong>",
  "reveal.stepReaction": "2. Reaction",
  "reveal.stepReactionDesc": "<strong>{target}</strong> chose <strong>{reaction}</strong>",
  "reveal.stepTruth": "3. Truth Revealed",
  "reveal.valGenuine": "🗡️ GENUINE (1 Power)",
  "reveal.valBluff": "🎭 BLUFF (0 Power)",
  "reveal.eliminatedNotice": "☠️ {player} has been ELIMINATED!",
  "reveal.attackBlockedTitle": "🛡️ ATTACK BLOCKED!",
  "reveal.attackBlockedSummary":
    "{attacker} attacked genuinely, but {target} spent 1 Power to Guard safely. Neither lost Influence!",
  "reveal.bluffInducedGuardTitle": "🎭 BLUFF INDUCED GUARD!",
  "reveal.bluffInducedGuardSummary":
    "{attacker} was bluffing! {target} spent 1 Power guarding against an empty threat.",
  "reveal.challengeCrushedTitle": "💥 CHALLENGE CRUSHED!",
  "reveal.challengeCrushedSummary":
    "{attacker}'s Strike was 100% GENUINE! {target} challenged in vain and suffers 2 Influence damage!",
  "reveal.bluffCaughtTitle": "🚨 BLUFF CAUGHT!",
  "reveal.bluffCaughtSummary":
    "BLUFF EXPOSED! {attacker} faked the strike. {target}'s challenge succeeded! {attacker} loses 1 Influence!",
  "reveal.strikeLandedTitle": "🗡️ STRIKE LANDED!",
  "reveal.strikeLandedSummary":
    "{target} yielded {timedOut} to {attacker}'s genuine Strike. {target} takes 1 Influence damage.",
  "reveal.bluffSucceededTitle": "🃏 BLUFF SUCCEEDED!",
  "reveal.bluffSucceededSummary":
    "{attacker} stole an Influence point with a pure bluff! {target} yielded {timedOut}.",

  // Event Log
  "log.title": "📜 Chronicle (Recent Events)",
  "log.actionCommitted":
    "⚔️ <strong>{attacker}</strong> claimed Strike on <strong>{target}</strong> (commitment hidden).",
  "log.reactionCommitted":
    "🛡️ <strong>{target}</strong> locked reaction: <strong>{choice}</strong>{timeout}.",
  "log.actionRevealed":
    "👁️ Reveal: <strong>{attacker}</strong>'s Strike was <strong>{truth}</strong>.",
  "log.bluffSucceeded":
    "🃏 Bluff succeeded: <strong>{attacker}</strong> won the bluff against <strong>{target}</strong>!",
  "log.powerRecovered": "⚡ <strong>{player}</strong> recovered +1 Power (now {power}).",
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
  "rules.turnTitle": "On Your Turn: Choose an Action",
  "rules.recoverRule": "Gain 1 Power (up to 3 max) and end your turn.",
  "rules.strikeRule": "Threaten a chosen living opponent. Privately choose your commitment:",
  "rules.bluffSubRule":
    "Free threat. Deals 1 Influence if they yield or guard. If Challenged, YOU lose 1 Influence!",
  "rules.genuineSubRule":
    "Costs 1 Power. If they Challenge, they suffer a devastating <strong>2 Influence loss</strong>!",
  "rules.reactionTitle": "Under Attack: Target's Reaction",
  "rules.reactionDesc": "The commitment is secret until you react. Choose wisely:",
  "rules.tableHeaderReaction": "Reaction",
  "rules.tableHeaderBluff": "If Attacker Bluffed (0 Power)",
  "rules.tableHeaderGenuine": "If Attacker Was Genuine (1 Power)",
  "rules.tableGuardName": "🛡️ Guard",
  "rules.tableGuardCost": "(Costs 1 Power)",
  "rules.tableGuardBluff": "Both safe. Target spent 1 Power.",
  "rules.tableGuardGenuine": "Both safe. Both spent 1 Power.",
  "rules.tableChallengeName": "👁️ Challenge",
  "rules.tableChallengeCost": "(Free)",
  "rules.tableChallengeBluff": "Bluff Caught! Attacker loses 1 Influence. Target unharmed.",
  "rules.tableChallengeGenuine": "Counter-Strike! Target loses 2 Influence!",
  "rules.tableYieldName": "🏳️ Yield",
  "rules.tableYieldCost": "(Free)",
  "rules.tableYieldBluff": "Target loses 1 Influence. Attacker spent 0.",
  "rules.tableYieldGenuine": "Target loses 1 Influence. Attacker spent 1.",
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
  "error.InternalError": "The server encountered an error. Please try again.",
};
