// ── State ─────────────────────────────────────────────────────────────────────
let sessionToken  = null;
let selectedFile  = null;
let activeTab     = "Flight"; // for error screen tabs
let pendingContToken = null;  // continuation token when remainingPax > 0
let currentUser = null;

// ── Elements ──────────────────────────────────────────────────────────────────
const uploadZone       = document.getElementById("uploadZone");
const fileInput        = document.getElementById("fileInput");
const selectedFileName = document.getElementById("selectedFileName");
const uploadBtn        = document.getElementById("uploadBtn");

const errSummary  = document.getElementById("errSummary");
const errTabs     = document.getElementById("errTabs");
const errList     = document.getElementById("errList");
const errOverflow = document.getElementById("errOverflow");
const reuploadBtn = document.getElementById("reuploadBtn");

const fileNameDisplay = document.getElementById("fileNameDisplay");
const rowCountDisplay = document.getElementById("rowCountDisplay");
const warnBanner      = document.getElementById("warnBanner");
const warnCount       = document.getElementById("warnCount");
const warnList        = document.getElementById("warnList");
const cancelBtn       = document.getElementById("cancelBtn");
const confirmBtn      = document.getElementById("confirmBtn");

const doneGlyph    = document.getElementById("doneGlyph");
const doneRing     = document.getElementById("doneRing");
const doneTitle    = document.getElementById("doneTitle");
const doneDetail   = document.getElementById("doneDetail");
const continueBtn  = document.getElementById("continueBtn");
const startOverBtn = document.getElementById("startOverBtn");

const contModal       = document.getElementById("contModal");
const contConfirmBtn  = document.getElementById("contConfirmBtn");
const contCancelBtn   = document.getElementById("contCancelBtn");
const footerClock  = document.getElementById("footerClock");

// Auth / admin elements
const loginUsername   = document.getElementById("loginUsername");
const loginPassword   = document.getElementById("loginPassword");
const loginError      = document.getElementById("loginError");
const loginBtn        = document.getElementById("loginBtn");
const headerUser      = document.getElementById("headerUser");
const sysBadge        = document.getElementById("sysBadge");
const headerUsername  = document.getElementById("headerUsername");
const adminBtn        = document.getElementById("adminBtn");
const logoutBtn       = document.getElementById("logoutBtn");
const adminDashboard  = document.getElementById("adminDashboard");
const backToUploadBtn = document.getElementById("backToUploadBtn");
const runsTbody       = document.getElementById("runsTbody");
const usersTbody      = document.getElementById("usersTbody");
const newUsername     = document.getElementById("newUsername");
const newPassword     = document.getElementById("newPassword");
const newRole         = document.getElementById("newRole");
const addUserBtn      = document.getElementById("addUserBtn");
const addUserError    = document.getElementById("addUserError");

// ── Clock ──────────────────────────────────────────────────────────────────────
function updateClock() {
  footerClock.textContent = new Date().toLocaleTimeString("he-IL", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}
updateClock();
setInterval(updateClock, 1000);

// ── Auth init ──────────────────────────────────────────────────────────────────
(async function init() {
  try {
    const res  = await fetch("/api/auth/me");
    const data = await res.json();
    if (data.success) {
      onLogin(data.user);
    } else {
      showScreen("login");
    }
  } catch {
    showScreen("login");
  }
})();

function onLogin(user) {
  currentUser = user;
  // Update header
  sysBadge.style.display = "none";
  headerUser.style.display = "flex";
  headerUsername.textContent = user.username;
  if (user.role === "admin") adminBtn.style.display = "";
  showScreen("upload");
}

// ── Screen routing ─────────────────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(`screen-${name}`).classList.add("active");
}

function resetState() {
  sessionToken  = null;
  selectedFile  = null;
  fileInput.value = "";
  selectedFileName.textContent = "";
  selectedFileName.classList.remove("visible");
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span>שלח לעיבוד</span><span class="arr" aria-hidden="true">←</span>';
  loginUsername.value = "";
  loginPassword.value = "";
}

// ── File selection ─────────────────────────────────────────────────────────────
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFileSelected(fileInput.files[0]);
});

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});

uploadZone.addEventListener("dragleave", (e) => {
  if (!uploadZone.contains(e.relatedTarget)) uploadZone.classList.remove("drag-over");
});

uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelected(file);
});

function handleFileSelected(file) {
  selectedFile = file;
  selectedFileName.textContent = `📄 ${file.name}`;
  selectedFileName.classList.add("visible");
  uploadBtn.disabled = false;
  showScreen("upload");
}

// ── Upload ─────────────────────────────────────────────────────────────────────
uploadBtn.addEventListener("click", async () => {
  const file = selectedFile;
  if (!file) return;

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span>מאמת קובץ...</span>';

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res  = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<span>שלח לעיבוד</span><span class="arr" aria-hidden="true">←</span>';

    if (!data.success) {
      renderErrors(data.errors || [], data.totalErrors || 0, data.warnings || []);
      showScreen("errors");
      return;
    }

    sessionToken = data.sessionToken;
    fileNameDisplay.textContent = data.originalName;
    rowCountDisplay.textContent = data.rowCount;
    renderWarnings(data.warnings || []);
    showScreen("confirm");

  } catch (err) {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<span>שלח לעיבוד</span><span class="arr" aria-hidden="true">←</span>';
    alert(`שגיאת תקשורת: ${err.message}`);
  }
});

// ── Error rendering ────────────────────────────────────────────────────────────
let _bySheet = {}; // kept for tab switching

function renderErrors(errors, totalErrors, warnings) {
  // Merge errors + warnings into one list per sheet, tagged with level
  _bySheet = {};

  errors.forEach(e => {
    const sheet = e.sheet || "כללי";
    if (!_bySheet[sheet]) _bySheet[sheet] = [];
    _bySheet[sheet].push({ ...e, level: "error" });
  });

  warnings.forEach(w => {
    const sheet = w.sheet || "כללי";
    if (!_bySheet[sheet]) _bySheet[sheet] = [];
    _bySheet[sheet].push({ ...w, level: "warning" });
  });

  const sheets      = Object.keys(_bySheet);
  const errCount    = errors.length;
  const warnCount_  = warnings.length;

  // ── Summary bar — each item is clickable ──────────────────────
  const summaryItems = sheets.map(s => {
    const sheetErrors   = (_bySheet[s] || []).filter(i => i.level === "error").length;
    const sheetWarnings = (_bySheet[s] || []).filter(i => i.level === "warning").length;
    const icon          = s === "Flight" ? "✈" : s === "PAX" ? "👤" : "📋";
    const parts         = [];
    if (sheetErrors)   parts.push(`<b>${sheetErrors} שגיאות</b>`);
    if (sheetWarnings) parts.push(`<span style="color:#ffb347">${sheetWarnings} אזהרות</span>`);
    return `<span class="err-sum-item" data-sheet="${s}">${icon} ${s}: ${parts.join(" · ")}</span>`;
  });

  if (totalErrors > errCount) {
    summaryItems.push(`<span style="color:var(--muted-hi)">מוצגות ${errCount} מתוך ${totalErrors} שגיאות</span>`);
  }

  errSummary.innerHTML = summaryItems.join("");

  // Make summary items clickable → switch tab
  errSummary.querySelectorAll(".err-sum-item").forEach(el => {
    el.addEventListener("click", () => switchTab(el.dataset.sheet));
  });

  // ── Tabs ───────────────────────────────────────────────────────
  activeTab = sheets[0] || "Flight";
  renderTabs(sheets);
  renderErrorList(_bySheet[activeTab] || []);

  // Overflow message
  errOverflow.textContent = totalErrors > errCount
    ? `... ועוד ${totalErrors - errCount} שגיאות נוספות — יש לתקן ולהעלות מחדש`
    : "";
}

function renderTabs(sheets) {
  errTabs.innerHTML = sheets.map(s => {
    const hasErrors   = (_bySheet[s] || []).some(i => i.level === "error");
    const hasWarnings = (_bySheet[s] || []).some(i => i.level === "warning");
    const dot = hasErrors ? "🔴" : hasWarnings ? "🟡" : "";
    return `<button class="err-tab ${s === activeTab ? "active" : ""}" data-sheet="${s}">${dot} ${s}</button>`;
  }).join("");

  errTabs.querySelectorAll(".err-tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.sheet));
  });
}

function switchTab(sheet) {
  activeTab = sheet;
  errTabs.querySelectorAll(".err-tab").forEach(b => b.classList.toggle("active", b.dataset.sheet === sheet));
  errSummary.querySelectorAll(".err-sum-item").forEach(el => el.classList.toggle("active", el.dataset.sheet === sheet));
  renderErrorList(_bySheet[sheet] || []);
}

function renderErrorList(items) {
  if (!items.length) {
    errList.innerHTML = `<li class="err-empty">אין פריטים בגליון זה</li>`;
    return;
  }
  errList.innerHTML = items.map(item => {
    const loc = [item.row ? `שורה ${item.row}` : null, item.field || null].filter(Boolean).join(" · ");
    return `<li class="${item.level === "warning" ? "is-warning" : ""}">
      <span class="err-loc">${loc || "—"}</span>
      <span class="err-msg">${item.message}</span>
    </li>`;
  }).join("");
}

// ── Re-upload ─────────────────────────────────────────────────────────────────
reuploadBtn.addEventListener("click", () => {
  resetState();
  showScreen("upload");
  fileInput.click();
});

// ── Warnings rendering (confirm screen) ───────────────────────────────────────
function renderWarnings(warnings) {
  if (!warnings.length) {
    warnBanner.style.display = "none";
    return;
  }
  warnBanner.style.display = "block";
  warnCount.textContent = warnings.length;
  warnList.innerHTML = warnings.map(w =>
    `<li>
      <span class="warn-field">${[w.sheet, w.field].filter(Boolean).join(" · ")}</span>
      <span>${w.message}</span>
    </li>`
  ).join("");
}

// ── Confirm / Cancel ──────────────────────────────────────────────────────────
cancelBtn.addEventListener("click", async () => {
  if (sessionToken) await sendAction("cancel").catch(() => {});
  resetState();
  showScreen("upload");
});

confirmBtn.addEventListener("click", async () => {
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<span>שולח...</span>';

  const result = await sendAction("confirm");
  confirmBtn.disabled = false;
  confirmBtn.innerHTML = '<span>אשר ושלח</span><span class="arr" aria-hidden="true">←</span>';

  if (result && result.jobId) {
    showScreen("done");
    doneRing.className    = "done-ring";
    doneGlyph.textContent = "⏳";
    doneTitle.textContent = "מעבד...";
    doneDetail.textContent = "מתחבר לאתר eAPIS";
    pollJob(result.jobId);
  }
});

async function sendAction(action) {
  if (!sessionToken) return null;
  try {
    const res  = await fetch("/api/confirm", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sessionToken, action }),
    });
    const data = await res.json();
    sessionToken = null;
    return data.success ? data : null;
  } catch (err) {
    alert(`שגיאת תקשורת: ${err.message}`);
    return null;
  }
}

async function pollJob(jobId) {
  try {
    const res  = await fetch(`/api/status/${jobId}`);
    const data = await res.json();

    doneDetail.textContent = data.detail || "";

    if (data.status === "done") {
      doneGlyph.textContent = "✅";
      doneTitle.textContent = "הושלם בהצלחה!";
      doneRing.className    = "done-ring success";
      if (data.remainingPax > 0 && data.contToken) {
        pendingContToken = data.contToken;
        continueBtn.textContent = `המשך תהליך — נותרו ${data.remainingPax} נוסעים`;
        continueBtn.style.display = "";
      } else {
        continueBtn.style.display = "none";
      }
    } else if (data.status === "error") {
      doneGlyph.textContent = "❌";
      doneTitle.textContent = "שגיאה";
      doneRing.className    = "done-ring error";
    } else if (data.status === "queued") {
      doneGlyph.textContent = "⏳";
      doneTitle.textContent = "ממתין בתור...";
      setTimeout(() => pollJob(jobId), 2000);
    } else {
      // running / pending — poll again in 2s
      doneGlyph.textContent = "⏳";
      doneTitle.textContent = "מעבד...";
      setTimeout(() => pollJob(jobId), 2000);
    }
  } catch {
    setTimeout(() => pollJob(jobId), 2000);
  }
}

// ── Done ──────────────────────────────────────────────────────────────────────
function showDone(success, title, detail) {
  doneGlyph.textContent  = success ? "✅" : "❌";
  doneTitle.textContent  = title;
  doneDetail.textContent = detail || "";
  doneRing.className     = `done-ring ${success ? "success" : "error"}`;
  showScreen("done");
}

startOverBtn.addEventListener("click", () => {
  resetState();
  showScreen("upload");
});

// ── Continuation flow ──────────────────────────────────────────────────────────
continueBtn.addEventListener("click", () => {
  contModal.style.display = "";
});

contCancelBtn.addEventListener("click", () => {
  contModal.style.display = "none";
  pendingContToken = null;
  continueBtn.style.display = "none";
  resetState();
  showScreen("upload");
});

contConfirmBtn.addEventListener("click", async () => {
  const token = pendingContToken;
  pendingContToken = null;
  contModal.style.display = "none";
  continueBtn.style.display = "none";

  // Start new job for remaining passengers
  try {
    const res  = await fetch("/api/continue", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ contToken: token }),
    });
    const data = await res.json();
    if (!data.success) { alert(data.message); return; }

    doneRing.className     = "done-ring";
    doneGlyph.textContent  = "⏳";
    doneTitle.textContent  = "מעבד...";
    doneDetail.textContent = "מתחבר לאתר eAPIS";
    showScreen("done");
    pollJob(data.jobId);
  } catch (err) {
    alert(`שגיאת תקשורת: ${err.message}`);
  }
});

// ── Login ──────────────────────────────────────────────────────────────────────
loginBtn.addEventListener("click", async () => {
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  loginError.textContent = "";
  loginBtn.disabled = true;
  loginBtn.innerHTML = "<span>מתחבר...</span>";
  try {
    const res  = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.success) {
      loginError.textContent = data.message || "שגיאת כניסה";
    } else {
      onLogin(data.user);
    }
  } catch (err) {
    loginError.textContent = `שגיאת תקשורת: ${err.message}`;
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span>כניסה</span><span class="arr">←</span>';
  }
});
// Enter key support
loginPassword.addEventListener("keydown", e => { if (e.key === "Enter") loginBtn.click(); });
loginUsername.addEventListener("keydown", e => { if (e.key === "Enter") loginPassword.focus(); });

// ── Logout ─────────────────────────────────────────────────────────────────────
logoutBtn.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  currentUser = null;
  sysBadge.style.display = "";
  headerUser.style.display = "none";
  adminBtn.style.display = "none";
  resetState();
  showScreen("login");
});

// ── Admin Dashboard ────────────────────────────────────────────────────────────
adminBtn.addEventListener("click", async () => {
  document.querySelector(".panel").style.display = "none";
  adminDashboard.style.display = "block";
  await refreshAdminDashboard();
});

backToUploadBtn.addEventListener("click", () => {
  adminDashboard.style.display = "none";
  document.querySelector(".panel").style.display = "block";
  showScreen("upload");
});

async function refreshAdminDashboard() {
  // Load runs
  try {
    const res  = await fetch("/api/admin/runs");
    const data = await res.json();
    runsTbody.innerHTML = (data.runs || []).map(r => {
      const statusLabel = { uploaded: "הועלה", validation_failed: "שגיאת ולידציה", cancelled: "בוטל", confirmed: "בעיבוד", partial: "חלקי", done: "הושלם", error: "שגיאה" }[r.status] || r.status;
      const statusClass = { done: "s-done", error: "s-error", partial: "s-partial", cancelled: "s-cancel", validation_failed: "s-error", confirmed: "s-running" }[r.status] || "s-default";
      const dt = r.created_at ? new Date(r.created_at).toLocaleString("he-IL") : "—";
      return `<tr>
        <td class="td-file">${escHtml(r.original_name)}</td>
        <td class="td-time">${dt}</td>
        <td class="td-num">${r.row_count}</td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
      </tr>`;
    }).join("") || '<tr><td colspan="4" class="td-empty">אין הרצות</td></tr>';
  } catch { runsTbody.innerHTML = '<tr><td colspan="4" class="td-empty">שגיאה בטעינה</td></tr>'; }

  // Load users
  try {
    const res  = await fetch("/api/admin/users");
    const data = await res.json();
    usersTbody.innerHTML = (data.users || []).map(u => {
      const isMe = u.id === currentUser?.id;
      const dt = u.created_at ? new Date(u.created_at).toLocaleString("he-IL") : "—";
      return `<tr>
        <td>${escHtml(u.username)}</td>
        <td>${u.role === "admin" ? "מנהל" : "משתמש"}</td>
        <td class="td-time">${dt}</td>
        <td>${isMe ? "" : `<button class="del-btn" data-id="${u.id}">מחק</button>`}</td>
      </tr>`;
    }).join("") || '<tr><td colspan="4" class="td-empty">אין משתמשים</td></tr>';
    // Attach delete handlers
    usersTbody.querySelectorAll(".del-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("למחוק משתמש זה?")) return;
        const res = await fetch(`/api/admin/users/${btn.dataset.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!data.success) { alert(data.message); return; }
        await refreshAdminDashboard();
      });
    });
  } catch { usersTbody.innerHTML = '<tr><td colspan="4" class="td-empty">שגיאה בטעינה</td></tr>'; }
}

addUserBtn.addEventListener("click", async () => {
  addUserError.textContent = "";
  const username = newUsername.value.trim();
  const password = newPassword.value;
  const role     = newRole.value;
  if (!username || !password) { addUserError.textContent = "יש למלא שם משתמש וסיסמה"; return; }
  const res  = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role }),
  });
  const data = await res.json();
  if (!data.success) { addUserError.textContent = data.message; return; }
  newUsername.value = ""; newPassword.value = "";
  await refreshAdminDashboard();
});

function escHtml(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
