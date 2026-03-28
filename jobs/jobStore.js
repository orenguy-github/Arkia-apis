"use strict";

/**
 * In-memory job store.
 * Statuses: "pending" | "running" | "done" | "error"
 */

const jobs = new Map();

function createJob() {
  const jobId = crypto.randomUUID();
  jobs.set(jobId, { status: "pending", detail: "ממתין לתחילת עיבוד..." });
  return jobId;
}

function setStatus(jobId, status, detail = "", extra = {}) {
  if (!jobs.has(jobId)) return;
  jobs.set(jobId, { status, detail, ...extra });
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

module.exports = { createJob, setStatus, getJob };
