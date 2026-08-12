import React, { useState, useEffect, useRef } from "react";
import { Repeat, MessageCircle, Phone, Plus, Check, X, Clock, Calendar, Send, ChevronLeft, Users } from "lucide-react";

const ME = "You";
const uid = () => Math.random().toString(36).slice(2, 10);

async function persist(key, value) {
  try {
    if (window.storage) {
      await window.storage.set(key, JSON.stringify(value), true);
    }
  } catch (e) {
    // in-memory state still holds even if persistence fails
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

const seedShifts = () => [
  {
    id: uid(),
    name: "Priya N.",
    myShift: "07:00 - 15:00, Front Desk",
    timing: "2026-08-14",
    neededShift: "15:00 - 23:00 (evening)",
    tlName: "Marcus D.",
    contactNumber: "555-0142",
    status: "open",
    postedAt: Date.now(),
  },
  {
    id: uid(),
    name: "Diego M.",
    myShift: "15:00 - 23:00, Support Line",
    timing: "2026-08-15",
    neededShift: "07:00 - 15:00 (morning)",
    tlName: "Renee F.",
    contactNumber: "555-0198",
    status: "open",
    postedAt: Date.now(),
  },
  {
    id: uid(),
    name: "Wren T.",
    myShift: "09:00 - 17:00, Dispatch",
    timing: "2026-08-17",
    neededShift: "Any afternoon shift",
    tlName: "Marcus D.",
    contactNumber: "555-0176",
    status: "open",
    postedAt: Date.now(),
  },
];

const seedThreads = () => [
  {
    id: uid(),
    shiftId: null,
    with: "Priya N.",
    messages: [
      { id: uid(), from: "Priya N.", text: "Hey! Any chance you'd trade for my Fri shift?", time: "9:02 AM" },
      { id: uid(), from: "You", text: "Possibly, let me check my schedule and get back to you.", time: "9:05 AM" },
    ],
  },
];

export default function ShiftSwapApp() {
  const [tab, setTab] = useState("board");
  const [shifts, setShifts] = useState(seedShifts);
  const [threads, setThreads] = useState(seedThreads);
  const [activeThread, setActiveThread] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [toast, setToast] = useState(null);
  const [callWith, setCallWith] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          const s = await window.storage.get("shiftswap:shifts", true).catch(() => null);
          const t = await window.storage.get("shiftswap:threads", true).catch(() => null);
          if (s?.value) {
            const loaded = JSON.parse(s.value);
            setShifts(loaded.filter((sh) => Date.now() - (sh.postedAt || 0) < DAY_MS));
          }
          if (t?.value) setThreads(JSON.parse(t.value));
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => { if (ready) persist("shiftswap:shifts", shifts); }, [shifts, ready]);
  useEffect(() => { if (ready) persist("shiftswap:threads", threads); }, [threads, ready]);

  useEffect(() => {
    const id = setInterval(() => {
      setShifts((prev) => prev.filter((s) => Date.now() - (s.postedAt || 0) < DAY_MS));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function openThreadWith(agentName, shiftId) {
    setThreads((prev) => {
      let t = prev.find((th) => th.with === agentName && th.shiftId === shiftId);
      if (t) {
        setActiveThread(t.id);
        return prev;
      }
      t = { id: uid(), shiftId, with: agentName, messages: [] };
      setActiveThread(t.id);
      return [...prev, t];
    });
    setTab("messages");
  }

  function sendMessage(threadId, text) {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, messages: [...t.messages, { id: uid(), from: ME, text, time: nowLabel() }] }
          : t
      )
    );
  }

  function contactAboutShift(shift) {
    openThreadWith(shift.name, shift.id);
    setTimeout(() => {
      setThreads((prev) => {
        const t = prev.find((th) => th.with === shift.name && th.shiftId === shift.id);
        if (!t) return prev;
        const already = t.messages.length > 0;
        if (already) return prev;
        return prev.map((th) =>
          th.id === t.id
            ? {
                ...th,
                messages: [
                  {
                    id: uid(),
                    from: ME,
                    text: `Hi ${shift.name.split(" ")[0]}, I saw your post — I can cover "${shift.myShift}" on ${fmtDate(shift.timing)}. Are you still looking to swap?`,
                    time: nowLabel(),
                  },
                ],
              }
            : th
        );
      });
    }, 60);
    flash(`Opened a chat with ${shift.name}`);
  }

  function markSwapped(shiftId) {
    setShifts((prev) => prev.map((s) => (s.id === shiftId ? { ...s, status: "swapped" } : s)));
    flash("Marked as already swapped");
  }

  function reopenShift(shiftId) {
    setShifts((prev) => prev.map((s) => (s.id === shiftId ? { ...s, status: "open" } : s)));
    flash("Reopened on the board");
  }

  function addShift(newShift) {
    setShifts((prev) => [{ ...newShift, id: uid(), status: "open", postedAt: Date.now() }, ...prev]);
    setShowPost(false);
    flash("Shift posted to the board");
  }

  return (
    <div style={styles.app}>
      <style>{`
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        button { cursor: pointer; font-family: inherit; }
        input, select, textarea { font-family: inherit; }
        ::placeholder { color: #7b8794; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <Header tab={tab} setTab={setTab} />

      <div style={styles.body}>
        {tab === "board" && (
          <Board
            shifts={shifts}
            onContact={contactAboutShift}
            onPost={() => setShowPost(true)}
            onMarkSwapped={markSwapped}
            onReopen={reopenShift}
          />
        )}
        {tab === "messages" && (
          <Messages
            threads={threads}
            activeThread={activeThread}
            setActiveThread={setActiveThread}
            onSend={sendMessage}
            onCall={(name) => setCallWith(name)}
          />
        )}
        {tab === "mine" && (
          <MyShifts shifts={shifts} onMarkSwapped={markSwapped} onReopen={reopenShift} />
        )}
      </div>

      {showPost && <PostShiftModal onClose={() => setShowPost(false)} onSubmit={addShift} />}
      {callWith && <CallOverlay name={callWith} onEnd={() => setCallWith(null)} />}
      {toast && <Toast text={toast} />}
    </div>
  );
}

function Header({ tab, setTab }) {
  return (
    <div style={styles.header}>
      <div style={styles.brandRow}>
        <div style={styles.brandMark}>
          <Repeat size={18} color="#0b1220" strokeWidth={2.5} />
        </div>
        <div>
          <div style={styles.brandName}>Swaply for WR agents</div>
          <div style={styles.brandSub}>shift exchange</div>
        </div>
      </div>
      <nav style={styles.nav}>
        <NavBtn icon={<Calendar size={16} />} label="Board" active={tab === "board"} onClick={() => setTab("board")} />
        <NavBtn icon={<MessageCircle size={16} />} label="Messages" active={tab === "messages"} onClick={() => setTab("messages")} />
        <NavBtn icon={<Users size={16} />} label="My shifts" active={tab === "mine"} onClick={() => setTab("mine")} />
      </nav>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.navBtn,
        background: active ? "#f2b134" : "transparent",
        color: active ? "#0b1220" : "#c7d0dc",
      }}
    >
      {icon}
      <span style={{ marginLeft: 6 }}>{label}</span>
    </button>
  );
}

function ShiftCard({ shift, mine, onContact, onMarkSwapped, onReopen }) {
  const swapped = shift.status === "swapped";
  return (
    <div style={{ ...styles.shiftCard, opacity: swapped ? 0.6 : 1 }}>
      <div style={styles.shiftCardTop}>
        <div style={styles.ownerRow}>
          <div style={styles.avatar}>{initials(shift.name)}</div>
          <span style={styles.ownerName}>{shift.name}</span>
        </div>
        <div style={{ ...styles.pendingTag, background: swapped ? "#2c3542" : "#5dcaa5", color: swapped ? "#c7d0dc" : "#04342c" }}>
          {swapped ? "Already swapped" : "Open"}
        </div>
      </div>

      <div style={styles.fieldGrid}>
        <Field label="My shift" value={shift.myShift} />
        <Field label="Date" value={fmtDate(shift.timing)} />
        <Field label="Needy shift" value={shift.neededShift} />
        <Field label="TL name" value={shift.tlName} />
        <Field label="Contact number" value={shift.contactNumber} />
      </div>

      <div style={styles.expiryText}>{expiryLabel(shift.postedAt)}</div>

      <div style={styles.cardActions}>
        {!mine && !swapped && (
          <>
            <button style={styles.ghostBtn} onClick={() => onContact(shift)}>
              <MessageCircle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              Message
            </button>
            <a href={`tel:${shift.contactNumber}`} style={{ ...styles.ghostBtn, textDecoration: "none", display: "inline-flex" }}>
              <Phone size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              Call
            </a>
          </>
        )}
        {mine && !swapped && (
          <button style={{ ...styles.primaryBtn, padding: "8px 14px" }} onClick={() => onMarkSwapped(shift.id)}>
            <Check size={14} style={{ marginRight: 6, verticalAlign: -3 }} />
            Mark as swapped
          </button>
        )}
        {swapped && (
          <button style={styles.ghostBtn} onClick={() => onReopen(shift.id)}>
            Reopen post
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>{value || "—"}</div>
    </div>
  );
}

function Board({ shifts, onContact, onPost, onMarkSwapped, onReopen }) {
  const others = shifts.filter((s) => s.name !== ME);
  return (
    <div style={{ animation: "slideUp 0.3s ease" }}>
      <div style={styles.sectionRow}>
        <div>
          <div style={styles.h1}>Open shift board</div>
          <div style={styles.subtext}>Contact an agent by message or voice call to arrange a swap.</div>
        </div>
        <button style={styles.primaryBtn} onClick={onPost}>
          <Plus size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
          Post a shift
        </button>
      </div>

      {others.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyTitle}>Nothing on the board</div>
          <div style={styles.emptySub}>Post a shift you need covered and it'll show up here.</div>
        </div>
      )}

      <div style={styles.grid}>
        {others.map((s) => (
          <ShiftCard key={s.id} shift={s} mine={false} onContact={onContact} onMarkSwapped={onMarkSwapped} onReopen={onReopen} />
        ))}
      </div>
    </div>
  );
}

function MyShifts({ shifts, onMarkSwapped, onReopen }) {
  const mine = shifts.filter((s) => s.name === ME);
  return (
    <div style={{ animation: "slideUp 0.3s ease" }}>
      <div style={styles.h1}>Your posted shifts</div>
      <div style={styles.subtext}>Mark a post as swapped once you've arranged it with another agent.</div>
      <div style={styles.grid}>
        {mine.map((s) => (
          <ShiftCard key={s.id} shift={s} mine={true} onContact={() => {}} onMarkSwapped={onMarkSwapped} onReopen={onReopen} />
        ))}
        {mine.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyTitle}>No shifts yet</div>
            <div style={styles.emptySub}>Post one from the board tab.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Messages({ threads, activeThread, setActiveThread, onSend, onCall }) {
  const thread = threads.find((t) => t.id === activeThread);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread?.messages?.length, activeThread]);

  if (!thread) {
    return (
      <div style={{ animation: "slideUp 0.3s ease" }}>
        <div style={styles.h1}>Messages</div>
        <div style={styles.subtext}>Text conversations with agents about shift swaps.</div>
        {threads.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyTitle}>No conversations yet</div>
            <div style={styles.emptySub}>Message someone from the board to start one.</div>
          </div>
        ) : (
          <div style={styles.threadList}>
            {threads.map((t) => {
              const last = t.messages[t.messages.length - 1];
              return (
                <button key={t.id} style={styles.threadRow} onClick={() => setActiveThread(t.id)}>
                  <div style={styles.avatar}>{initials(t.with)}</div>
                  <div style={{ flex: 1, textAlign: "left", marginLeft: 12 }}>
                    <div style={styles.threadName}>{t.with}</div>
                    <div style={styles.threadPreview}>{last ? last.text : "No messages yet"}</div>
                  </div>
                  {last && <div style={styles.threadTime}>{last.time}</div>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ animation: "slideUp 0.3s ease", display: "flex", flexDirection: "column", height: "70vh" }}>
      <div style={styles.chatHeader}>
        <button style={styles.iconBtn} onClick={() => setActiveThread(null)}>
          <ChevronLeft size={18} />
        </button>
        <div style={styles.avatar}>{initials(thread.with)}</div>
        <div style={{ marginLeft: 10, flex: 1 }}>
          <div style={styles.threadName}>{thread.with}</div>
          <div style={styles.onlineDot}>● online</div>
        </div>
        <button style={styles.iconBtn} onClick={() => onCall(thread.with)} aria-label="Voice call">
          <Phone size={17} />
        </button>
      </div>

      <div ref={scrollRef} style={styles.chatScroll}>
        {thread.messages.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.from === ME ? "flex-end" : "flex-start", marginBottom: 10 }}>
            <div style={m.from === ME ? styles.bubbleMe : styles.bubbleThem}>
              <div>{m.text}</div>
              <div style={styles.bubbleTime}>{m.time}</div>
            </div>
          </div>
        ))}
      </div>

      <form
        style={styles.chatInputRow}
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onSend(thread.id, draft.trim());
          setDraft("");
        }}
      >
        <input
          style={styles.chatInput}
          placeholder="Write a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" style={styles.sendBtn} aria-label="Send message">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function PostShiftModal({ onClose, onSubmit }) {
  const [name, setName] = useState(ME);
  const [myShift, setMyShift] = useState("");
  const [timing, setTiming] = useState("");
  const [neededShift, setNeededShift] = useState("");
  const [tlName, setTlName] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.h2}>Post a shift</div>
          <button style={styles.iconBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!myShift || !timing || !neededShift || !tlName || !contactNumber || !name) return;
            onSubmit({ name, myShift, timing, neededShift, tlName, contactNumber });
          }}
        >
          <label style={styles.label}>Name</label>
          <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />

          <label style={styles.label}>My shift</label>
          <input style={styles.input} value={myShift} onChange={(e) => setMyShift(e.target.value)} placeholder="e.g. 07:00 - 15:00, Front Desk" required />

          <label style={styles.label}>Date</label>
          <input style={styles.input} type="date" value={timing} onChange={(e) => setTiming(e.target.value)} required />

          <label style={styles.label}>Needy shift</label>
          <input style={styles.input} value={neededShift} onChange={(e) => setNeededShift(e.target.value)} placeholder="e.g. 15:00 - 23:00 (evening)" required />

          <label style={styles.label}>TL name</label>
          <input style={styles.input} value={tlName} onChange={(e) => setTlName(e.target.value)} placeholder="Team lead's name" required />

          <label style={styles.label}>Contact number</label>
          <input style={styles.input} type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="555-0123" required />

          <button type="submit" style={{ ...styles.primaryBtn, width: "100%", marginTop: 16, justifyContent: "center" }}>
            <Check size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
            Post to board
          </button>
        </form>
      </div>
    </div>
  );
}

function CallOverlay({ name, onEnd }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.callCard}>
        <div style={styles.callAvatar}>{initials(name)}</div>
        <div style={styles.h2}>{name}</div>
        <div style={styles.subtext}>Voice call · {mm}:{ss}</div>
        <button style={styles.endCallBtn} onClick={onEnd} aria-label="End call">
          <Phone size={20} style={{ transform: "rotate(135deg)" }} />
        </button>
        <div style={{ ...styles.subtext, marginTop: 8 }}>Tap to end call</div>
      </div>
    </div>
  );
}

function Toast({ text }) {
  return <div style={styles.toast}>{text}</div>;
}

function initials(name) {
  return (name || "").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
function expiryLabel(postedAt) {
  if (!postedAt) return "";
  const msLeft = DAY_MS - (Date.now() - postedAt);
  if (msLeft <= 0) return "Expiring now";
  const hrs = Math.floor(msLeft / (60 * 60 * 1000));
  const mins = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
  if (hrs < 1) return `Expires in ${mins}m`;
  return `Expires in ${hrs}h ${mins}m`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function nowLabel() {
  return new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const styles = {
  app: { background: "#0b1220", minHeight: "100vh", color: "#e8ecf1", padding: 0 },
  header: { background: "#0e1626", borderBottom: "1px solid #1c2636", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "sticky", top: 0, zIndex: 5 },
  brandRow: { display: "flex", alignItems: "center", gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 9, background: "#f2b134", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  brandName: { fontSize: 15, fontWeight: 700, letterSpacing: -0.2 },
  brandSub: { fontSize: 11, color: "#7b8794", marginTop: -2 },
  nav: { display: "flex", gap: 6, background: "#111a2b", padding: 4, borderRadius: 10 },
  navBtn: { display: "flex", alignItems: "center", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, transition: "all 0.15s" },
  body: { maxWidth: 960, margin: "0 auto", padding: "28px 20px 60px" },
  sectionRow: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 },
  h1: { fontSize: 22, fontWeight: 700, letterSpacing: -0.3 },
  h2: { fontSize: 17, fontWeight: 700 },
  subtext: { fontSize: 13, color: "#8792a1", marginTop: 4 },
  primaryBtn: { display: "flex", alignItems: "center", background: "#f2b134", color: "#0b1220", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13, fontWeight: 700 },
  ghostBtn: { display: "flex", alignItems: "center", background: "transparent", color: "#c7d0dc", border: "1px solid #2a3546", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 14 },
  shiftCard: { background: "#111a2b", border: "1px solid #1c2636", borderRadius: 14, padding: 16, animation: "popIn 0.25s ease" },
  shiftCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  roleTag: { fontSize: 11, fontWeight: 700, color: "#f2b134", background: "rgba(242,177,52,0.12)", padding: "3px 9px", borderRadius: 6, letterSpacing: 0.3 },
  pendingTag: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6 },
  ownerRow: { display: "flex", alignItems: "center" },
  ownerName: { fontSize: 13, marginLeft: 8, color: "#c7d0dc", fontWeight: 600 },
  fieldGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", marginBottom: 14, borderTop: "1px solid #1c2636", paddingTop: 12 },
  fieldLabel: { fontSize: 10.5, fontWeight: 700, color: "#7b8794", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  fieldValue: { fontSize: 13, color: "#e8ecf1" },
  expiryText: { fontSize: 11, color: "#f2b134", marginBottom: 12 },
  cardActions: { display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" },
  avatar: { width: 30, height: 30, borderRadius: "50%", background: "#213049", color: "#c7d0dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  emptyState: { border: "1px dashed #2a3546", borderRadius: 14, padding: "40px 20px", textAlign: "center" },
  emptyTitle: { fontSize: 15, fontWeight: 700, marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#8792a1" },
  threadList: { display: "flex", flexDirection: "column", gap: 4, marginTop: 8 },
  threadRow: { display: "flex", alignItems: "center", background: "#111a2b", border: "1px solid #1c2636", borderRadius: 12, padding: "12px 14px", textAlign: "left" },
  threadName: { fontSize: 14, fontWeight: 700 },
  threadPreview: { fontSize: 12.5, color: "#8792a1", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 400 },
  threadTime: { fontSize: 11, color: "#5c6674" },
  chatHeader: { display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid #1c2636", marginBottom: 6 },
  iconBtn: { background: "transparent", border: "none", color: "#c7d0dc", padding: 8, borderRadius: 8, display: "flex", alignItems: "center" },
  onlineDot: { fontSize: 11, color: "#5dcaa5" },
  chatScroll: { flex: 1, overflowY: "auto", padding: "12px 4px" },
  bubbleMe: { background: "#f2b134", color: "#0b1220", padding: "9px 13px", borderRadius: "14px 14px 4px 14px", maxWidth: "72%", fontSize: 13.5, lineHeight: 1.45 },
  bubbleThem: { background: "#1a2536", color: "#e8ecf1", padding: "9px 13px", borderRadius: "14px 14px 14px 4px", maxWidth: "72%", fontSize: 13.5, lineHeight: 1.45 },
  bubbleTime: { fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" },
  chatInputRow: { display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid #1c2636" },
  chatInput: { flex: 1, background: "#111a2b", border: "1px solid #2a3546", borderRadius: 10, padding: "11px 14px", color: "#e8ecf1", fontSize: 13.5, outline: "none" },
  sendBtn: { background: "#f2b134", border: "none", borderRadius: 10, width: 42, display: "flex", alignItems: "center", justifyContent: "center", color: "#0b1220" },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(4,8,16,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 },
  modal: { background: "#111a2b", border: "1px solid #1c2636", borderRadius: 16, padding: 22, width: "100%", maxWidth: 380, maxHeight: "90vh", overflowY: "auto", animation: "popIn 0.2s ease" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  label: { display: "block", fontSize: 11.5, fontWeight: 700, color: "#8792a1", marginTop: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  input: { width: "100%", background: "#0b1220", border: "1px solid #2a3546", borderRadius: 9, padding: "9px 12px", color: "#e8ecf1", fontSize: 13.5, outline: "none" },
  callCard: { background: "#111a2b", border: "1px solid #1c2636", borderRadius: 20, padding: "40px 30px", display: "flex", flexDirection: "column", alignItems: "center", animation: "popIn 0.25s ease" },
  callAvatar: { width: 76, height: 76, borderRadius: "50%", background: "#213049", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#f2b134" },
  endCallBtn: { width: 54, height: 54, borderRadius: "50%", background: "#e24b4a", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 20 },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1a2536", border: "1px solid #2a3546", color: "#e8ecf1", padding: "10px 18px", borderRadius: 10, fontSize: 13, zIndex: 60, animation: "slideUp 0.25s ease" },
};
