"use strict";

/**
 * Stores continuation data for multi-batch passenger submissions.
 * Token → { rows, remainingPax }   (2-hour TTL)
 */

const store = new Map();

function storeContinuation(rows, remainingPax, paxOffset) {
  const token = crypto.randomUUID();
  store.set(token, { rows, remainingPax, paxOffset });
  setTimeout(() => store.delete(token), 2 * 60 * 60 * 1000);
  return token;
}

function getContinuation(token) {
  return store.get(token) || null;
}

function deleteContinuation(token) {
  store.delete(token);
}

module.exports = { storeContinuation, getContinuation, deleteContinuation };
