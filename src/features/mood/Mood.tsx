import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSync } from "../sync/yjsRoom";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";
import { appendIfNew, loadHistory, todayISO, type DayCounts, type HistoryEntry } from "./history";

type MoodEntry = { mood: 0 | 1 | 2 | 3 | 4; date: string };
type Props = { roomId: string };

const FACES = ["😞", "😕", "😐", "🙂", "😄"] as const;
const LABELS = ["awful", "low", "okay", "good", "great"] as const;
const COLORS = ["#e74c3c", "#f39c12", "#95a5a6", "#3498db", "#2ecc71"] as const;

export function Mood({ roomId }: Props) {
  const [armed, setArmed] = useState(false);
  const [tick, setTick] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [today, setToday] = useState(todayISO());
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const lastSnapshotRef = useRef<string | null>(null);

  const mesh = useMemo(() => {
    if (!armed) return null;
    const room = createRoomSync(roomId);
    const moods = room.doc.getMap<MoodEntry>("moods");
    return { room, moods };
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return undefined;
    void maybeFetchTurnCredentials();
    return undefined;
  }, [armed]);

  useEffect(() => {
    return () => {
      mesh?.room.provider?.destroy();
    };
  }, [mesh]);

  useEffect(() => {
    if (!mesh) return undefined;
    const onChange = () => setTick((t) => t + 1);
    mesh.moods.observe(onChange);
    return () => {
      mesh.moods.unobserve(onChange);
    };
  }, [mesh]);

  // Daily snapshot poller: every minute, check if local date changed.
  // If so, snapshot yesterday's aggregate (from current Yjs state) into local history.
  useEffect(() => {
    if (!mesh) return undefined;
    const checkDate = () => {
      const cur = todayISO();
      if (cur !== today) {
        // Date rolled over. The Yjs `moods` may still hold yesterday-dated entries
        // (we filter them out on read). Snapshot those before the new day's votes overwrite.
        const yesterday = today;
        const counts = aggregate(mesh, yesterday);
        if (yesterday !== lastSnapshotRef.current && counts.some((n) => n > 0)) {
          lastSnapshotRef.current = yesterday;
          const next = appendIfNew({ date: yesterday, counts });
          setHistory(next);
        }
        setToday(cur);
      }
    };
    const id = window.setInterval(checkDate, 60_000);
    return () => window.clearInterval(id);
  }, [mesh, today]);

  void tick;

  if (!armed || !mesh) {
    return (
      <div className="mood-arm">
        <h1>mesh-mood-check</h1>
        <p>
          Daily team mood barometer. Tap a face; the aggregate updates instantly. Nothing about who
          felt what is ever published outside today's aggregate. A 7-day history is kept locally on
          your phone only.
        </p>
        <button type="button" className="mood-arm-button" onClick={() => setArmed(true)}>
          Connect
        </button>
        <p className="mood-hint">
          Room <code>{roomId}</code>
        </p>
      </div>
    );
  }

  const myKey = mesh.room.peerId;
  const myEntry = mesh.moods.get(myKey);
  const myMood = myEntry && myEntry.date === today ? myEntry.mood : null;

  const counts = aggregate(mesh, today);
  const total = counts.reduce((a, b) => a + b, 0);

  const cast = (m: 0 | 1 | 2 | 3 | 4) => {
    mesh.moods.set(myKey, { mood: m, date: today });
  };

  return (
    <div className="mood-stage">
      <div className="mood-hud">
        <span>{today}</span>
        <span>·</span>
        <span>
          {total} mood{total === 1 ? "" : "s"} today
        </span>
      </div>

      <StackedBar counts={counts} total={total} />

      <div className="mood-counts">
        {counts.map((c, i) => (
          <div key={i} className="mood-count-pill" style={{ borderColor: COLORS[i] }}>
            <span className="mood-count-face">{FACES[i]}</span>
            <span className="mood-count-num">{c}</span>
          </div>
        ))}
      </div>

      <div className="mood-cells">
        {([0, 1, 2, 3, 4] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`mood-cell${myMood === m ? " mood-cell-mine" : ""}`}
            onClick={() => cast(m)}
            aria-label={LABELS[m]}
          >
            {FACES[m]}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="mood-history-toggle"
        onClick={() => setShowHistory((s) => !s)}
      >
        {showHistory ? "Hide history" : `7-day history (${history.length} days)`}
      </button>

      {showHistory && <HistoryChart history={history.slice(-7)} />}
    </div>
  );
}

function aggregate(
  mesh: { moods: { forEach: (cb: (v: MoodEntry, k: string) => void) => void } },
  date: string,
): DayCounts {
  const counts: DayCounts = [0, 0, 0, 0, 0];
  mesh.moods.forEach((v) => {
    if (!v) return;
    if (v.date !== date) return;
    if (v.mood < 0 || v.mood > 4) return;
    counts[v.mood] = (counts[v.mood] ?? 0) + 1;
  });
  return counts;
}

function StackedBar({ counts, total }: { counts: DayCounts; total: number }) {
  if (total === 0) {
    return (
      <div className="mood-stacked-empty">
        <span>no one has checked in yet</span>
      </div>
    );
  }
  return (
    <div className="mood-stacked" role="img" aria-label="mood distribution today">
      {counts.map((c, i) => {
        const pct = (c / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={i}
            className="mood-stacked-seg"
            style={{ width: `${pct}%`, background: COLORS[i] }}
            title={`${LABELS[i]}: ${c}`}
          >
            {pct > 12 && <span>{FACES[i]}</span>}
          </div>
        );
      })}
    </div>
  );
}

function HistoryChart({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="mood-history-empty">
        No history yet. After tonight a snapshot of today's aggregate will appear here.
      </div>
    );
  }
  return (
    <div className="mood-history">
      {history.map((day) => {
        const sum = day.counts.reduce((a, b) => a + b, 0);
        return (
          <div key={day.date} className="mood-history-row">
            <span className="mood-history-date">{day.date.slice(5)}</span>
            <div className="mood-history-bar">
              {day.counts.map((c, i) => {
                const pct = sum === 0 ? 0 : (c / sum) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={i}
                    className="mood-history-seg"
                    style={{ width: `${pct}%`, background: COLORS[i] }}
                    title={`${LABELS[i]}: ${c}`}
                  />
                );
              })}
            </div>
            <span className="mood-history-count">{sum}</span>
          </div>
        );
      })}
    </div>
  );
}
