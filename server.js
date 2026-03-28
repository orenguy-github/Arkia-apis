"use strict";

// Must be set before any Playwright require
const path = require("path");
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, ".playwright");

const express = require("express");
const config  = require("./config");

// Load .env file if it exists
try {
  require("fs").readFileSync(path.join(__dirname, ".env"), "utf8")
    .split("\n")
    .forEach(line => {
      const [key, ...rest] = line.split("=");
      if (key && !key.startsWith("#") && rest.length) {
        process.env[key.trim()] = rest.join("=").trim();
      }
    });
} catch (_) {
  // .env not found — rely on real environment variables
}

const uploadRoutes = require("./routes/upload");

const PUBLIC_DIR = path.join(__dirname, "public");

const app = express();
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.use("/api", uploadRoutes);

// Fallback: serve index.html for any non-API route
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(config.PORT, () => {
  console.log(`שרת פועל: http://localhost:${config.PORT}`);
});
