"use strict";

/**
 * Serial job queue — runs one automation at a time.
 * Additional jobs wait with status "queued" until the current one finishes.
 */

const { setStatus } = require("./jobStore");

let running = false;
const queue = []; // [{ jobId, rows, fn }]

function enqueue(jobId, rows, fn) {
  queue.push({ jobId, rows, fn });
  setStatus(jobId, "queued", `ממתין בתור — ${queue.length} עבודה לפניך`);
  _drain();
}

async function _drain() {
  if (running || queue.length === 0) return;
  running = true;

  const { jobId, rows, fn } = queue.shift();

  // Update queue-position messages for remaining jobs
  queue.forEach(({ jobId: qid }, i) =>
    setStatus(qid, "queued", `ממתין בתור — ${i + 1} עבודה לפניך`)
  );

  try {
    await fn(jobId, rows);
  } catch (err) {
    setStatus(jobId, "error", `שגיאה: ${err.message}`);
  } finally {
    running = false;
    _drain();
  }
}

module.exports = { enqueue };
