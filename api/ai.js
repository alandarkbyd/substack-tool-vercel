const https = require("https");

module.exports = async function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", message: "API is running!" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed: " + req.method });
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({
      error: "OPENROUTER_API_KEY সেট নেই। Vercel → Project Settings → Environment Variables এ যোগ করো।"
    });
  }

  const { model, messages, max_tokens, temperature } = req.body || {};
  if (!model || !messages) {
    return res.status(400).json({ error: "model এবং messages দুটোই দরকার।" });
  }

  const postData = JSON.stringify({
    model,
    messages,
    max_tokens: max_tokens || 1400,
    temperature: temperature !== undefined ? temperature : 0.75,
  });

  const options = {
    hostname: "openrouter.ai",
    path: "/api/v1/chat/completions",
    method: "POST",
    headers: {
      "Authorization": "Bearer " + OPENROUTER_API_KEY,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
      "HTTP-Referer": (req.headers && (req.headers.origin || req.headers.referer)) || "https://your-site.vercel.app",
      "X-Title": "Substack Viral Generator",
    },
  };

  try {
    const result = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let raw = "";
        response.on("data", (chunk) => (raw += chunk));
        response.on("end", () => {
          try { resolve({ status: response.statusCode, data: JSON.parse(raw) }); }
          catch (e) { reject(new Error("Parse error: " + raw.slice(0, 300))); }
        });
      });
      request.on("error", (e) => reject(new Error("Network error: " + e.message)));
      request.write(postData);
      request.end();
    });

    if (result.status !== 200) {
      return res.status(result.status).json({
        error: "[OpenRouter " + result.status + "] " + (result.data?.error?.message || JSON.stringify(result.data))
      });
    }

    return res.status(200).json(result.data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
