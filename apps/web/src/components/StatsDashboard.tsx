import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { WirePlayerView } from "@shadow-council/protocol";
import {
  type InfluenceSnapshot,
  type PlayerStatsSummary,
  matchStatsTracker,
  getPlayerColor,
} from "../presentation/match-stats.js";

interface StatsDashboardProps {
  snapshots: readonly InfluenceSnapshot[];
  players: readonly WirePlayerView[];
  viewerId: string;
  winnerId?: string | undefined;
  inGame?: boolean | undefined;
}

interface ChartDataPoint {
  label: string;
  round: number;
  step: number;
  [playerId: string]: number | string;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  snapshots,
  players,
  viewerId,
  winnerId,
  inGame = false,
}) => {
  const [activeTab, setActiveTab] = useState<"chart" | "performance">("chart");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const summaries: readonly PlayerStatsSummary[] = useMemo(() => {
    return matchStatsTracker.getPlayerSummaries(players, viewerId, winnerId);
  }, [players, viewerId, winnerId, snapshots]);

  // Prepare chart data points
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (snapshots.length === 0) {
      // Fallback initial point
      const initialPoint: ChartDataPoint = {
        label: "Start",
        round: 1,
        step: 0,
      };
      for (const p of players) {
        initialPoint[p.playerId] = 3;
      }
      return [initialPoint];
    }

    return snapshots.map((s) => {
      const point: ChartDataPoint = {
        label: s.label,
        round: s.round,
        step: s.step,
      };
      for (const p of players) {
        point[p.playerId] = s.influences[p.playerId] ?? 0;
      }
      return point;
    });
  }, [snapshots, players]);

  return (
    <div className="stats-dashboard">
      <div className="stats-dashboard__header">
        <div className="stats-dashboard__title-row">
          <h3 className="stats-dashboard__title">
            <span className="stats-dashboard__icon">📊</span>
            Match Influence Analytics
          </h3>
          <div className="stats-dashboard__tabs">
            <button
              type="button"
              className={`stats-tab-btn ${activeTab === "chart" ? "stats-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("chart")}
            >
              📈 Influence Trajectory
            </button>
            <button
              type="button"
              className={`stats-tab-btn ${activeTab === "performance" ? "stats-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("performance")}
            >
              🎖️ Player Breakdown
            </button>
          </div>
        </div>

        {/* Player Quick Filter Chips */}
        <div className="stats-dashboard__player-chips">
          <button
            type="button"
            className={`stats-chip ${selectedPlayerId === null ? "stats-chip--active" : ""}`}
            onClick={() => setSelectedPlayerId(null)}
          >
            All Players ({players.length})
          </button>
          {players.map((p) => {
            const color = getPlayerColor(p.playerId, viewerId, players);
            const isSelected = selectedPlayerId === p.playerId;
            return (
              <button
                key={p.playerId}
                type="button"
                className={`stats-chip ${isSelected ? "stats-chip--active" : ""}`}
                style={{
                  borderColor: color,
                  backgroundColor: isSelected ? `${color}25` : "transparent",
                }}
                onClick={() => setSelectedPlayerId(isSelected ? null : p.playerId)}
              >
                <span className="stats-chip__dot" style={{ backgroundColor: color }} />
                <span>{p.displayName}</span>
                {p.playerId === viewerId && <span className="stats-chip__badge">You</span>}
                {p.playerId === winnerId && <span className="stats-chip__badge">👑</span>}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "chart" ? (
        <div className="stats-dashboard__chart-wrap">
          <div className="stats-dashboard__chart-info">
            <span className="stats-chart-caption">
              Tracking council influence (3 = Full Power, 0 = Eliminated) over match rounds
            </span>
          </div>

          <div style={{ width: "100%", height: 320, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 15, right: 25, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  domain={[0, 3]}
                  ticks={[0, 1, 2, 3]}
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return (
                      <div className="stats-tooltip">
                        <div className="stats-tooltip__title">{label}</div>
                        <div className="stats-tooltip__list">
                          {payload.map((item) => {
                            const pId = item.dataKey as string;
                            const pl = players.find((p) => p.playerId === pId);
                            const val = Number(item.value ?? 0);
                            const isDead = val <= 0;
                            return (
                              <div key={pId} className="stats-tooltip__row">
                                <span
                                  className="stats-tooltip__color"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="stats-tooltip__name">
                                  {pl?.displayName ?? pId}
                                  {pId === viewerId ? " (You)" : ""}
                                </span>
                                <span className="stats-tooltip__value">
                                  {isDead ? "💀 0 (Out)" : `🛡️ ${val}/3`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={0}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{
                    value: "Elimination",
                    fill: "#ef4444",
                    fontSize: 10,
                    position: "insideBottomRight",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ paddingTop: "12px" }}
                  formatter={(value: string) => {
                    const pl = players.find((p) => p.playerId === value);
                    const isSelf = value === viewerId;
                    const isWin = value === winnerId;
                    return (
                      <span style={{ color: "#cbd5e1", fontSize: "12px", marginRight: "10px" }}>
                        {pl?.displayName ?? value}
                        {isSelf ? " (You)" : ""}
                        {isWin ? " 👑" : ""}
                      </span>
                    );
                  }}
                />
                {players.map((p) => {
                  const color = getPlayerColor(p.playerId, viewerId, players);
                  const isVisible = selectedPlayerId === null || selectedPlayerId === p.playerId;
                  const opacity = isVisible ? 1 : 0.15;
                  const strokeWidth = selectedPlayerId === p.playerId ? 3.5 : 2.5;

                  return (
                    <Line
                      key={p.playerId}
                      type="monotone"
                      dataKey={p.playerId}
                      name={p.playerId}
                      stroke={color}
                      strokeWidth={strokeWidth}
                      strokeOpacity={opacity}
                      dot={{
                        r: 4,
                        stroke: color,
                        strokeWidth: 2,
                        fill: "#0f172a",
                        fillOpacity: opacity,
                      }}
                      activeDot={{
                        r: 6,
                        stroke: "#ffffff",
                        strokeWidth: 2,
                        fill: color,
                      }}
                      isAnimationActive={!inGame}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="stats-dashboard__performance-grid">
          {summaries.map((summary) => (
            <div
              key={summary.playerId}
              className={`stats-player-card ${summary.isWinner ? "stats-player-card--winner" : ""} ${summary.isViewer ? "stats-player-card--viewer" : ""}`}
              style={{ borderLeftColor: summary.color }}
            >
              <div className="stats-player-card__header">
                <div className="stats-player-card__title">
                  <span className="stats-player-card__avatar">
                    {summary.isWinner ? "🏆" : summary.eliminated ? "💀" : "👤"}
                  </span>
                  <div>
                    <h4 className="stats-player-card__name">
                      {summary.displayName}
                      {summary.isViewer && <span className="badge badge--self ml-1">You</span>}
                    </h4>
                    <span className="stats-player-card__tag" style={{ color: summary.color }}>
                      {summary.tag}
                    </span>
                  </div>
                </div>
                <div className="stats-player-card__influence-badge">
                  <span>Influence</span>
                  <strong style={{ color: summary.color }}>
                    {summary.finalInfluence}/3
                  </strong>
                </div>
              </div>

              {/* Visual Health Gauge */}
              <div className="stats-meter-wrap">
                <div className="stats-meter">
                  <div
                    className="stats-meter__fill"
                    style={{
                      width: `${(summary.finalInfluence / 3) * 100}%`,
                      backgroundColor: summary.color,
                    }}
                  />
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="stats-metrics-grid">
                <div className="stats-metric-item">
                  <span className="stats-metric-label">Peak Influence</span>
                  <span className="stats-metric-value">{summary.peakInfluence} / 3</span>
                </div>
                <div className="stats-metric-item">
                  <span className="stats-metric-label">Final Power</span>
                  <span className="stats-metric-value">
                    {summary.finalPower === undefined ? "Hidden" : `${summary.finalPower} / 3`}
                  </span>
                </div>
                <div className="stats-metric-item">
                  <span className="stats-metric-label">Strikes Dealt</span>
                  <span className="stats-metric-value">⚔️ {summary.strikesDealt}</span>
                </div>
                <div className="stats-metric-item">
                  <span className="stats-metric-label">Strikes Taken</span>
                  <span className="stats-metric-value">🛡️ {summary.strikesReceived}</span>
                </div>
                <div className="stats-metric-item">
                  <span className="stats-metric-label">Bluffs Worked</span>
                  <span className="stats-metric-value">
                    🎭 {summary.bluffsSucceeded}/{summary.bluffsDeclared}
                  </span>
                </div>
                <div className="stats-metric-item">
                  <span className="stats-metric-label">Challenges Won</span>
                  <span className="stats-metric-value">
                    👁️ {summary.challengesWon}/{summary.challengesMade}
                  </span>
                </div>
                <div className="stats-metric-item">
                  <span className="stats-metric-label">Hybrid Defense</span>
                  <span className="stats-metric-value">🛡️👁️ {summary.hybridDefenses}</span>
                </div>
                <div className="stats-metric-item">
                  <span className="stats-metric-label">Yields</span>
                  <span className="stats-metric-value">🏳️ {summary.yields}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export function mountStatsDashboard(
  container: HTMLElement,
  snapshots: readonly InfluenceSnapshot[],
  players: readonly WirePlayerView[],
  viewerId: string,
  winnerId?: string,
  inGame = false,
): () => void {
  const root = createRoot(container);
  root.render(
    <StatsDashboard
      snapshots={snapshots}
      players={players}
      viewerId={viewerId}
      winnerId={winnerId}
      inGame={inGame}
    />,
  );

  return () => {
    try {
      root.unmount();
    } catch {
      // Ignored if already unmounted
    }
  };
}
