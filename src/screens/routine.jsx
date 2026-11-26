import { useState } from "react";
import { Icon } from "../components/ui.jsx";
import { routineView } from "../data/routine.js";

/** Today's routine: the part of the day it is now is open and marked "Now"; the others fold. */
export function RoutineCard({ routine, done, onTick, onWhy }) {
  const slots = routineView(routine, done);
  const [openIds, setOpenIds] = useState(() => slots.filter((s) => s.current).map((s) => s.id));
  if (!slots.length) return null;
  const toggle = (id) => setOpenIds((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  return (
    <section className="routine" aria-labelledby="routine-h">
      <h2 id="routine-h">Your routine today</h2>
      {slots.map((s) => {
        const on = openIds.includes(s.id);
        const status = s.all ? "Done" : s.past || s.current ? `${s.n} of ${s.total} done` : `${s.total} thing${s.total === 1 ? "" : "s"}`;
        if (!on) return (
          <button key={s.id} type="button" className={`rt-fold rs-${s.id}${s.all ? " all" : ""}`} onClick={() => toggle(s.id)} aria-expanded="false">
            <span className="rt-dot" aria-hidden="true">{s.all && <Icon name="check" size={15} stroke={3.2} />}</span>
            <strong>{s.current ? s.now : s.label}</strong>
            <span className="rt-status">{status}</span>
            <Icon name="chev" size={16} />
          </button>
        );
        return (
          <div key={s.id} className={`rt-slot rs-${s.id}${s.current ? " now" : ""}`}>
            <button type="button" className="rt-head" onClick={() => toggle(s.id)} aria-expanded="true">
              <strong>{s.current ? s.now : s.label}</strong>
              <span className="rt-status">{s.next ? "Next" : s.current ? "Now" : status}</span>
            </button>
            {s.items.map((it) => (
              <div key={it.id} className={`rt-item${it.done ? " done" : ""}`}>
                <label>
                  <input type="checkbox" checked={it.done} onChange={() => onTick(it.id)} />
                  <span className="rt-box" aria-hidden="true">{it.done && <Icon name="check" size={16} stroke={3.2} />}</span>
                  <span className="rt-text">{it.text}</span>
                </label>
                {it.why && <button type="button" className="rt-why" onClick={() => onWhy(it.why)} aria-label={`Why: ${it.text}`}>Why?</button>}
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
