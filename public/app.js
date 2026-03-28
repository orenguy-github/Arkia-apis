// ── State ─────────────────────────────────────────────────────────────────────
let sessionToken = null;
let selectedFile  = null;
let activeTab     = "Flight"; // for error screen tabs

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
const startOverBtn = document.getElementById("startOverBtn");
const footerClock  = document.getElementById("footerClock");

// ── Clock ──────────────────────────────────────────────────────────────────────
function updateClock() {
  footerClock.textContent = new Date().toLocaleTimeString("he-IL", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}
updateClock();
setInterval(updateClock, 1000);

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
  if (sessionToken) await sendAction("cancel");
  resetState();
  showScreen("upload");
});

confirmBtn.addEventListener("click", async () => {
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<span>שולח...</span>';

  const ok = await sendAction("confirm");
  confirmBtn.disabled = false;
  confirmBtn.innerHTML = '<span>אשר ושלח</span><span class="arr" aria-hidden="true">←</span>';

  if (ok) showDone(true, "הטעינה אושרה!", "הנתונים נקלטו בהצלחה במערכת");
});

async function sendAction(action) {
  if (!sessionToken) return false;
  try {
    const res  = await fetch("/api/confirm", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sessionToken, action }),
    });
    const data = await res.json();
    sessionToken = null;
    return data.success;
  } catch (err) {
    alert(`שגיאת תקשורת: ${err.message}`);
    return false;
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
