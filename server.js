"use strict";

const express = require("express");
const path    = require("path");
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

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", uploadRoutes);

app.listen(config.PORT, () => {
  console.log(`שרת פועל: http://localhost:${config.PORT}`);
});
