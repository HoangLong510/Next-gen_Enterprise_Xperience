import express from "express";
import cors from "cors";
import pkg from "@vitalets/google-translate-api";

const { translate } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/translate", async (req, res) => {
  try {
    const { text, to = "vi" } = req.query;
    if (!text) {
      return res.status(400).json({ error: "Missing text query param" });
    }

    const result = await translate(text, { to });
    res.json({ translated: result.text });
  } catch (err) {
    console.error("Translate error:", err);
    res.status(500).json({ error: "Translation failed" });
  }
});

// 👇 cho phép PORT từ env, mặc định 6000
const PORT = process.env.PORT || 6000;
app.listen(PORT, () => {
  console.log(`Translate service running at http://localhost:${PORT}`);
});
