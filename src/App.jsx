// CSRM frontend - Campus Smart Resource Management System
// Setup: npm create vite@latest csrm-frontend -- --template react && cd csrm-frontend
//        npm i axios   then replace src/App.jsx with this file and run: npm run dev
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080" });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
const errMsg = (e) => e?.response?.data?.message || e?.response?.data?.error || "Something went wrong. Check the server and try again.";
const today = () => new Date().toISOString().slice(0, 10);
const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 08:00 - 17:00 slots
const pad = (h) => String(h).padStart(2, "0") + ":00";

const css = `
:root{--ink:#14213d;--paper:#f4f6f8;--card:#fff;--line:#d9dee5;--blue:#1d4e89;--gold:#e0a100;--ok:#1f7a4d;--bad:#b3261e}
*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",system-ui,sans-serif;background:var(--paper);color:var(--ink)}
h1,h2,h3{font-family:Georgia,serif;margin:0 0 .6rem}
button{cursor:pointer;border:0;border-radius:6px;padding:.55rem .95rem;background:var(--blue);color:#fff;font:inherit}
button.ghost{background:transparent;color:var(--blue);border:1px solid var(--blue)}
button.bad{background:var(--bad)}button.ok{background:var(--ok)}button:disabled{opacity:.45;cursor:not-allowed}
button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--gold);outline-offset:1px}
input,select{font:inherit;padding:.55rem;border:1px solid var(--line);border-radius:6px;width:100%;background:#fff}
label{display:block;font-size:.9rem;margin:.7rem 0 .25rem}
.auth{max-width:400px;margin:8vh auto;background:var(--card);padding:2rem;border-radius:10px;border-top:6px solid var(--gold)}
.bar{display:flex;justify-content:space-between;align-items:center;background:var(--ink);color:#fff;padding:.8rem 1.4rem}
.bar h1{margin:0;font-size:1.25rem}.bar span{opacity:.8;margin-right:1rem}
.tabs{display:flex;gap:.4rem;padding:1rem 1.4rem 0;flex-wrap:wrap}
.tabs button{background:#e6eaf0;color:var(--ink)}.tabs button.on{background:var(--blue);color:#fff}
.wrap{padding:1.4rem;display:grid;gap:1.2rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.2rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:1.2rem}
table{width:100%;border-collapse:collapse;font-size:.92rem}th,td{text-align:left;padding:.5rem;border-bottom:1px solid var(--line)}
.slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:.4rem;margin:.6rem 0}
.slot{background:#e9f3ec;color:var(--ok);border:1px solid #bcdcc8}.slot.taken{background:#f1dedc;color:var(--bad);border-color:#e3b7b3}
.slot.pick{background:var(--blue);color:#fff;border-color:var(--blue)}
.pill{padding:.15rem .55rem;border-radius:99px;font-size:.8rem;background:#e6eaf0}
.pill.APPROVED,.pill.CONFIRMED{background:#d5eedf;color:var(--ok)}.pill.REJECTED,.pill.CANCELLED{background:#f6d9d6;color:var(--bad)}.pill.PENDING{background:#fbecc2}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem}.stats b{font-size:1.8rem;display:block;font-family:Georgia,serif}
.toasts{position:fixed;right:1rem;bottom:1rem;display:grid;gap:.5rem;z-index:9}
.toast{background:var(--ink);color:#fff;padding:.7rem 1rem;border-radius:8px;border-left:5px solid var(--gold);max-width:320px}
.toast.err{border-color:var(--bad)}.row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}.row>*{flex:1}
.muted{color:#5c6b7d;font-size:.9rem}
@media(prefers-reduced-motion:no-preference){.toast{animation:in .25s}}@keyframes in{from{transform:translateY(8px);opacity:0}}
`;

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((text, err = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const logout = () => { localStorage.clear(); setUser(null); };

  // 401 -> session expired
  useEffect(() => {
    const id = api.interceptors.response.use((r) => r, (e) => {
      if (e.response?.status === 401 && localStorage.getItem("token")) { logout(); notify("Session expired. Please log in again.", true); }
      return Promise.reject(e);
    });
    return () => api.interceptors.response.eject(id);
  }, [notify]);

  return (
    <>
      <style>{css}</style>
      {!user ? <Auth onLogin={setUser} notify={notify} /> : (
        <>
          <div className="bar">
            <h1>CSRM · Campus Resources</h1>
            <div><span>{user.username} ({user.role})</span><button className="ghost" style={{ color: "#fff", borderColor: "#fff" }} onClick={logout}>Log out</button></div>
          </div>
          {user.role === "ADMIN" ? <AdminDash notify={notify} /> : <UserDash user={user} notify={notify} />}
        </>
      )}
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={"toast" + (t.err ? " err" : "")}>{t.text}</div>)}</div>
    </>
  );
}

/* ---------- Login & Registration ---------- */
function Auth({ onLogin, notify }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ username: "", password: "", role: "STUDENT", email: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    try {
      if (mode === "register") {
        await api.post("/api/auth/register", f);
        notify("Registered. An admin must approve your account before you can log in.");
        setMode("login");
      } else {
        const { data } = await api.post("/api/auth/login", { username: f.username, password: f.password });
        localStorage.setItem("token", data.token);
        const u = { username: data.username || f.username, role: data.role, id: data.id };
        localStorage.setItem("user", JSON.stringify(u));
        onLogin(u);
      }
    } catch (e) { notify(errMsg(e), true); }
  };

  return (
    <div className="auth">
      <h2>{mode === "login" ? "Log in" : "Create account"}</h2>
      <p className="muted">Book classrooms, labs, lockers and equipment.</p>
      <label htmlFor="u">Username</label><input id="u" value={f.username} onChange={set("username")} />
      <label htmlFor="p">Password</label><input id="p" type="password" value={f.password} onChange={set("password")} />
      {mode === "register" && (<><label htmlFor="e">Email</label><input id="e" type="email" required value={f.email} onChange={set("email")} />
        <label htmlFor="r">I am a</label>
        <select id="r" value={f.role} onChange={set("role")}><option value="STUDENT">Student</option><option value="FACULTY">Faculty</option></select></>)}
      <div style={{ marginTop: "1.2rem" }} className="row">
        <button onClick={submit} disabled={!f.username || !f.password || (mode === "register" && !f.email)}>{mode === "login" ? "Log in" : "Register"}</button>
        <button className="ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "New here? Register" : "Back to log in"}</button>
      </div>
    </div>
  );
}

/* ---------- Student / Faculty dashboard ---------- */
function UserDash({ user, notify }) {
  const [tab, setTab] = useState("book");
  const canService = user.role === "STUDENT";
  return (
    <>
      <div className="tabs">
        {[["book", "Book a resource"], ["mine", "My bookings"], ...(canService ? [["svc", "Request service"]] : [])].map(([k, l]) =>
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div className="wrap">
        {tab === "book" && <BookingCalendar user={user} notify={notify} />}
        {tab === "mine" && <MyBookings notify={notify} />}
        {tab === "svc" && <ServiceRequest notify={notify} />}
      </div>
    </>
  );
}

function BookingCalendar({ user, notify }) {
  const [resources, setResources] = useState([]);
  const [rid, setRid] = useState("");
  const [date, setDate] = useState(today());
  const [taken, setTaken] = useState([]);
  const [range, setRange] = useState([]); // selected hours

  useEffect(() => { api.get("/api/resources", { params: { date } }).then((r) => setResources(r.data)).catch((e) => notify(errMsg(e), true)); }, [date]);
  const loadTaken = useCallback(() => {
    if (!rid) return;
    api.get("/api/bookings", { params: { resourceId: rid, date } }).then((r) => setTaken(r.data)).catch((e) => notify(errMsg(e), true));
  }, [rid, date]);
  useEffect(() => { loadTaken(); setRange([]); }, [loadTaken]);

  const isTaken = (h) => taken.some((b) => b.status !== "CANCELLED" && new Date(b.startTime).getHours() <= h && h < new Date(b.endTime).getHours());
  const toggle = (h) => setRange((r) => (r.includes(h) ? r.filter((x) => x !== h) : [...r, h].sort((a, b) => a - b)));
  const contiguous = range.length > 0 && range.every((h, i) => i === 0 || h === range[i - 1] + 1);

  const book = async () => {
    try {
      await api.post("/api/bookings", {
        resourceId: Number(rid),
        startTime: `${date}T${pad(range[0])}:00`,
        endTime: `${date}T${pad(range[range.length - 1] + 1)}:00`,
      });
      notify("Booking confirmed. A confirmation email/SMS is on its way.");
      setRange([]); loadTaken();
    } catch (e) { notify(errMsg(e), true); }
  };

  return (
    <div className="card">
      <h2>Booking calendar</h2>
      <div className="row">
        <div><label htmlFor="d">Date</label><input id="d" type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label htmlFor="res">Resource</label>
          <select id="res" value={rid} onChange={(e) => setRid(e.target.value)}>
            <option value="">Choose a resource</option>
            {resources.filter((r) => r.availability !== false).map((r) => <option key={r.id} value={r.id}>{r.name} ({r.type}, {r.location})</option>)}
          </select></div>
      </div>
      {rid ? (<>
        <p className="muted">Green slots are free. Select consecutive hours.</p>
        <div className="slots">{HOURS.map((h) => (
          <button key={h} disabled={isTaken(h)} className={"slot" + (isTaken(h) ? " taken" : "") + (range.includes(h) ? " pick" : "")} onClick={() => toggle(h)}>{pad(h)}</button>))}
        </div>
        <button onClick={book} disabled={!contiguous}>Book {range.length ? `${pad(range[0])} to ${pad(range[range.length - 1] + 1)}` : "selected time"}</button>
        {range.length > 0 && !contiguous && <p className="muted">Pick hours that follow each other.</p>}
      </>) : <p className="muted">Pick a resource to see its free slots.</p>}
    </div>
  );
}

function MyBookings({ notify }) {
  const [list, setList] = useState([]);
  const [edit, setEdit] = useState(null); // {id,date,start,end}
  const load = () => api.get("/api/bookings/my").then((r) => setList(r.data)).catch((e) => notify(errMsg(e), true));
  useEffect(() => { load(); }, []);

  const phase = (b) => { const n = Date.now(); return b.status === "CANCELLED" ? "Cancelled" : new Date(b.endTime) < n ? "Past" : new Date(b.startTime) <= n ? "Ongoing" : "Upcoming"; };
  const cancel = async (id) => { try { await api.delete(`/api/bookings/${id}`); notify("Booking cancelled."); load(); } catch (e) { notify(errMsg(e), true); } };
  const save = async () => {
    try {
      await api.put(`/api/bookings/${edit.id}`, { startTime: `${edit.date}T${edit.start}:00`, endTime: `${edit.date}T${edit.end}:00` });
      notify("Booking updated."); setEdit(null); load();
    } catch (e) { notify(errMsg(e), true); }
  };

  return (
    <div className="card">
      <h2>My bookings</h2>
      {list.length === 0 ? <p className="muted">No bookings yet. Use “Book a resource” to make one.</p> : (
        <table><thead><tr><th>Resource</th><th>Start</th><th>End</th><th>State</th><th></th></tr></thead><tbody>
          {list.map((b) => (
            <tr key={b.id}><td>{b.resourceName || `#${b.resourceId}`}</td>
              <td>{new Date(b.startTime).toLocaleString()}</td><td>{new Date(b.endTime).toLocaleString()}</td>
              <td><span className={"pill " + b.status}>{phase(b)}</span></td>
              <td>{phase(b) === "Upcoming" && (<div className="row">
                <button className="ghost" onClick={() => setEdit({ id: b.id, date: b.startTime.slice(0, 10), start: b.startTime.slice(11, 16), end: b.endTime.slice(11, 16) })}>Modify</button>
                <button className="bad" onClick={() => cancel(b.id)}>Cancel</button></div>)}</td></tr>))}
        </tbody></table>)}
      {edit && (<div style={{ marginTop: "1rem" }}><h3>Modify booking</h3><div className="row">
        <input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
        <input type="time" value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} />
        <input type="time" value={edit.end} onChange={(e) => setEdit({ ...edit, end: e.target.value })} />
        <button onClick={save}>Save changes</button><button className="ghost" onClick={() => setEdit(null)}>Close</button></div></div>)}
    </div>
  );
}

function ServiceRequest({ notify }) {
  const [text, setText] = useState("");
  const send = async () => {
    try { await api.post("/api/services", { description: text }); notify("Service request sent."); setText(""); }
    catch (e) { notify(errMsg(e), true); }
  };
  return (<div className="card"><h2>Request a service</h2>
    <label htmlFor="sv">What do you need? (e.g. lab assistance on Friday)</label>
    <input id="sv" value={text} onChange={(e) => setText(e.target.value)} />
    <div style={{ marginTop: "1rem" }}><button onClick={send} disabled={!text.trim()}>Send request</button></div></div>);
}

/* ---------- Admin dashboard ---------- */
function AdminDash({ notify }) {
  const [tab, setTab] = useState("overview");
  return (
    <>
      <div className="tabs">
        {[["overview", "Overview"], ["users", "Users"], ["resources", "Resources"], ["bookings", "Bookings"], ["audit", "Audit logs"]].map(([k, l]) =>
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div className="wrap">
        {tab === "overview" && <Overview notify={notify} />}
        {tab === "users" && <Users notify={notify} />}
        {tab === "resources" && <Resources notify={notify} />}
        {tab === "bookings" && <AllBookings notify={notify} />}
        {tab === "audit" && <Audit notify={notify} />}
      </div>
    </>
  );
}

function Overview({ notify }) {
  const [s, setS] = useState({});
  useEffect(() => { api.get("/api/admin/stats").then((r) => setS(r.data)).catch((e) => notify(errMsg(e), true)); }, []);
  const items = [["Resource utilization", s.utilization != null ? s.utilization + "%" : "-"], ["Pending approvals", s.pendingUsers ?? "-"], ["Active bookings", s.activeBookings ?? "-"], ["Booking conflicts", s.conflicts ?? "-"]];
  return (<div className="card"><h2>Dashboard</h2><div className="stats">{items.map(([l, v]) => <div key={l}><b>{v}</b><span className="muted">{l}</span></div>)}</div></div>);
}

function Users({ notify }) {
  const [list, setList] = useState([]);
  const load = () => api.get("/api/admin/users").then((r) => setList(r.data)).catch((e) => notify(errMsg(e), true));
  useEffect(() => { load(); }, []);
  const act = async (id, body, msg) => { try { await api.put(`/api/admin/users/${id}`, body); notify(msg); load(); } catch (e) { notify(errMsg(e), true); } };
  return (<div className="card"><h2>User accounts</h2>
    <table><thead><tr><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>
      {list.map((u) => (<tr key={u.id}><td>{u.username}</td>
        <td><select value={u.role} onChange={(e) => act(u.id, { role: e.target.value }, "Role updated.")}>{["STUDENT", "FACULTY", "ADMIN"].map((r) => <option key={r}>{r}</option>)}</select></td>
        <td><span className={"pill " + u.status}>{u.status}</span></td>
        <td>{u.status === "PENDING" && <div className="row"><button className="ok" onClick={() => act(u.id, { status: "APPROVED" }, "Account approved.")}>Approve</button>
          <button className="bad" onClick={() => act(u.id, { status: "REJECTED" }, "Account rejected.")}>Reject</button></div>}</td></tr>))}
    </tbody></table>{list.length === 0 && <p className="muted">No users to show.</p>}</div>);
}

function Resources({ notify }) {
  const blank = { name: "", type: "CLASSROOM", location: "", availability: true };
  const [list, setList] = useState([]);
  const [f, setF] = useState(blank);
  const load = () => api.get("/api/resources").then((r) => setList(r.data)).catch((e) => notify(errMsg(e), true));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try { f.id ? await api.put(`/api/resources/${f.id}`, f) : await api.post("/api/resources", f); notify(f.id ? "Resource updated." : "Resource added."); setF(blank); load(); }
    catch (e) { notify(errMsg(e), true); }
  };
  const remove = async (id) => { try { await api.delete(`/api/resources/${id}`); notify("Resource removed."); load(); } catch (e) { notify(errMsg(e), true); } };
  return (<div className="grid">
    <div className="card"><h2>{f.id ? "Edit resource" : "Add resource"}</h2>
      <label htmlFor="n">Name</label><input id="n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <label htmlFor="t">Type</label><select id="t" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{["CLASSROOM", "LAB", "LOCKER", "EQUIPMENT"].map((t) => <option key={t}>{t}</option>)}</select>
      <label htmlFor="l">Location</label><input id="l" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
      <label><input type="checkbox" style={{ width: "auto" }} checked={f.availability} onChange={(e) => setF({ ...f, availability: e.target.checked })} /> Available for booking</label>
      <div className="row" style={{ marginTop: ".8rem" }}><button onClick={save} disabled={!f.name || !f.location}>Save resource</button>{f.id && <button className="ghost" onClick={() => setF(blank)}>Cancel edit</button>}</div></div>
    <div className="card"><h2>All resources</h2><table><thead><tr><th>Name</th><th>Type</th><th>Location</th><th></th></tr></thead><tbody>
      {list.map((r) => (<tr key={r.id}><td>{r.name}</td><td>{r.type}</td><td>{r.location}</td>
        <td><div className="row"><button className="ghost" onClick={() => setF(r)}>Edit</button><button className="bad" onClick={() => remove(r.id)}>Remove</button></div></td></tr>))}
    </tbody></table></div></div>);
}

function AllBookings({ notify }) {
  const [list, setList] = useState([]);
  const load = () => api.get("/api/bookings").then((r) => setList(r.data)).catch((e) => notify(errMsg(e), true));
  useEffect(() => { load(); }, []);
  const cancel = async (id) => { try { await api.delete(`/api/bookings/${id}`); notify("Booking cancelled."); load(); } catch (e) { notify(errMsg(e), true); } };
  return (<div className="card"><h2>All bookings</h2><table><thead><tr><th>User</th><th>Resource</th><th>Start</th><th>End</th><th>Status</th><th></th></tr></thead><tbody>
    {list.map((b) => (<tr key={b.id}><td>{b.username || b.userId}</td><td>{b.resourceName || b.resourceId}</td><td>{new Date(b.startTime).toLocaleString()}</td><td>{new Date(b.endTime).toLocaleString()}</td>
      <td><span className={"pill " + b.status}>{b.status}</span></td><td>{b.status !== "CANCELLED" && <button className="bad" onClick={() => cancel(b.id)}>Cancel</button>}</td></tr>))}
  </tbody></table>{list.length === 0 && <p className="muted">No bookings yet.</p>}</div>);
}

function Audit({ notify }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState({ userId: "", date: "" });
  const load = () => api.get("/api/audit", { params: { userId: q.userId || undefined, date: q.date || undefined } }).then((r) => setList(r.data)).catch((e) => notify(errMsg(e), true));
  useEffect(() => { load(); }, []);
  return (<div className="card"><h2>Audit logs</h2>
    <div className="row"><input placeholder="User ID" value={q.userId} onChange={(e) => setQ({ ...q, userId: e.target.value })} />
      <input type="date" value={q.date} onChange={(e) => setQ({ ...q, date: e.target.value })} /><button onClick={load}>Filter</button></div>
    <table><thead><tr><th>Time</th><th>User</th><th>Action</th></tr></thead><tbody>
      {list.map((a) => <tr key={a.id}><td>{new Date(a.timestamp).toLocaleString()}</td><td>{a.username || a.userId}</td><td>{a.action}</td></tr>)}
    </tbody></table>{list.length === 0 && <p className="muted">No log entries match.</p>}</div>);
}
