export async function translateReason(text) {
  try {
    const res = await fetch(
      `http://localhost:5000/translate?text=${encodeURIComponent(text)}&to=vi`
    );
    const data = await res.json();
    return data.translated || text;
  } catch (e) {
    console.error("Translate API error:", e);
    return text; // fallback giữ nguyên
  }
}
