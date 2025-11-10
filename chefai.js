// /api/chefai.js (updated)
// Uses model 'gpt-4o-mini' and local fallback chefai-fallback.json
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const body = req.body || {};
  const { sign = "aries", meal = "breakfast", lang = "fr", count = 3, context = "" } = body;

  // Load local fallback file
  const fallbackFile = path.resolve(process.cwd(), "chefai-fallback.json");
  let fallbackData = null;
  try {
    const raw = fs.readFileSync(fallbackFile, "utf-8");
    const parsed = JSON.parse(raw);
    fallbackData = parsed[lang] || parsed["fr"] || [];
  } catch (e) {
    console.warn("Could not load fallback file:", e.message);
    fallbackData = [];
  }

  const sampleFallback = (sign, meal, lang, count) => {
    if (Array.isArray(fallbackData) && fallbackData.length > 0) {
      return { recipes: fallbackData.slice(0, count) };
    }
    const sample = [];
    for (let i = 0; i < count; i++) {
      sample.push({
        title: `${sign} - Exemple recette ${i+1} (${meal})`,
        ingredients: ["1 pincée d'amour","200g d'ingrédients locaux","Sel, poivre"],
        steps: ["Mélanger", "Cuire 10 minutes", "Servir avec un sourire"],
        nutrition: "~450 kcal • 18g protéines • 12g lipides • 60g glucides",
        poem: lang === "fr" ? "Un plat qui chante aux étoiles." : lang === "en" ? "A dish that hums to the stars." : "طبق يهمس للنجوم."
      });
    }
    return { recipes: sample };
  };

  const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
  if (!OPENAI_KEY) {
    return res.status(200).json({
      warning: "OPENAI_API_KEY not configured on server — returning local fallback sample.",
      ...sampleFallback(sign, meal, lang, count)
    });
  }

  const systemPrompt = `
You are Chef-AI for AstroFood Premium Gold. Produce exactly a JSON object (no extra text) with a top-level key "recipes" which is an array of recipe objects.
Each recipe object must contain:
- "title": short title string,
- "ingredients": array of ingredient strings,
- "steps": array of short step strings (ordered),
- "nutrition": short nutrition summary string (kcal and macros if possible),
- "poem": a short poetic line (one sentence) suitable for the premium card.

Constraints:
- Return exactly valid JSON with no explanatory text.
- Provide 'count' recipes (use the requested count).
- Include at least one authentic African ingredient or variation when possible.
- Keep each string concise (ingredients <= 120 chars, steps <= 200 chars).
- Language must match the requested language code: fr/en/ar.
`;

  const userPrompt = `
Parameters:
sign: ${sign}
meal: ${meal}
lang: ${lang}
count: ${count}
context: ${context}

Produce ${count} recipes adapted to the sign "${sign}" for the "${meal}" meal in language "${lang}".
`;

  try {
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.6,
        n: 1
      })
    });

    if (!openaiResp.ok) {
      const txt = await openaiResp.text();
      console.error("OpenAI error:", openaiResp.status, txt);
      return res.status(502).json({
        error: "OpenAI API returned an error",
        status: openaiResp.status,
        body: txt,
        fallback: sampleFallback(sign, meal, lang, count)
      });
    }

    const data = await openaiResp.json();
    const assistant = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!assistant || typeof assistant !== "string") {
      return res.status(502).json({ error: "No assistant content", raw: data });
    }

    let jsonText = assistant.trim();
    if (jsonText.startsWith("```")) {
      const lines = jsonText.split("\\n");
      const startFence = lines.findIndex(l => l.trim().startsWith("```"));
      const endFence = lines.lastIndexOf("```");
      if (startFence !== -1 && endFence !== -1 && endFence > startFence) {
        jsonText = lines.slice(startFence+1, endFence).join("\\n");
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("JSON parse error:", e.message);
      return res.status(502).json({
        error: "Failed to parse JSON from OpenAI response",
        parseError: e.message,
        assistant: assistant,
        fallback: sampleFallback(sign, meal, lang, count)
      });
    }

    if (!parsed || !Array.isArray(parsed.recipes)) {
      return res.status(502).json({
        error: "OpenAI response JSON shape invalid (expected parsed.recipes[]).",
        parsed,
        fallback: sampleFallback(sign, meal, lang, count)
      });
    }

    const recipes = parsed.recipes.map(r => ({
      title: (r.title || "").toString().trim(),
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
      steps: Array.isArray(r.steps) ? r.steps.map(String) : [],
      nutrition: (r.nutrition || "").toString().trim(),
      poem: (r.poem || "").toString().trim()
    }));

    if (recipes.length < count) {
      const pad = sampleFallback(sign, meal, lang, count).recipes;
      for (let i = recipes.length; i < count; i++) recipes.push(pad[i] || pad[0]);
    }

    return res.status(200).json({ recipes });

  } catch (err) {
    console.error("Server error in /api/chefai:", err);
    return res.status(500).json({
      error: "Server error",
      message: err.message,
      fallback: sampleFallback(sign, meal, lang, count)
    });
  }
};
