// pages/api/chefai.js
// Chef-AI endpoint: call OpenAI (gpt-4o-mini) or fallback, then optionally save to Supabase.
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = SUPA_URL && SUPA_KEY ? createClient(SUPA_URL, SUPA_KEY) : null;

const loadFallback = (lang) => {
  const fallbackFile = path.resolve(process.cwd(), "chefai-fallback.json");
  try {
    const raw = fs.readFileSync(fallbackFile, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed[lang] || parsed["fr"] || [];
  } catch (e) {
    console.warn("Could not load fallback file:", e.message);
    return [];
  }
};

const sampleFallback = (sign, meal, lang, count) => {
  const fallbackData = loadFallback(lang);
  if (Array.isArray(fallbackData) && fallbackData.length > 0) {
    return { recipes: fallbackData.slice(0, count) };
  }
  const sample = [];
  for (let i = 0; i < count; i++) {
    sample.push({
      title: `${sign} - Exemple recette ${i + 1} (${meal})`,
      ingredients: ["1 pincée d'amour", "200g d'ingrédients locaux", "Sel, poivre"],
      steps: ["Mélanger", "Cuire 10 minutes", "Servir avec un sourire"],
      nutrition: "~450 kcal • 18g protéines • 12g lipides • 60g glucides",
      poem: lang === "fr" ? "Un plat qui chante aux étoiles." : lang === "en" ? "A dish that hums to the stars." : "طبق يهمس للنجوم."
    });
  }
  return { recipes: sample };
};

async function callOpenAI({ sign, meal, lang, count, context, OPENAI_KEY }) {
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

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
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

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${txt}`);
  }

  const data = await resp.json();
  const assistant = data.choices?.[0]?.message?.content;
  if (!assistant || typeof assistant !== "string") {
    throw new Error("No assistant content from OpenAI");
  }

  // strip fences
  let jsonText = assistant.trim();
  if (jsonText.startsWith("```")) {
    const lines = jsonText.split("\n");
    const startFence = lines.findIndex(l => l.trim().startsWith("```"));
    const endFence = lines.lastIndexOf("```");
    if (startFence !== -1 && endFence !== -1 && endFence > startFence) {
      jsonText = lines.slice(startFence + 1, endFence).join("\n");
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error("Failed to parse JSON from OpenAI response: " + e.message + "\nAssistant raw: " + assistant.substring(0, 1000));
  }

  if (!parsed || !Array.isArray(parsed.recipes)) {
    throw new Error("OpenAI response JSON shape invalid (expected parsed.recipes[]).");
  }

  const recipes = parsed.recipes.map(r => ({
    id: r.id ? String(r.id) : `recipe_${nanoid(8)}`,
    title: (r.title || "").toString().trim(),
    ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
    steps: Array.isArray(r.steps) ? r.steps.map(String) : [],
    nutrition: (r.nutrition || "").toString().trim(),
    poem: (r.poem || "").toString().trim(),
    sign,
    lang,
    notes: "generated"
  }));

  return recipes;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const body = req.body || {};
  const { sign = "taurus", meal = "breakfast", lang = "fr", count = 1, context = "", email = null } = body;

  const OPENAI_KEY = process.env.OPENAI_API_KEY || "";

  let recipes = [];

  try {
    if (OPENAI_KEY) {
      try {
        recipes = await callOpenAI({ sign, meal, lang, count, context, OPENAI_KEY });
      } catch (openaiErr) {
        console.warn("OpenAI failed, falling back:", openaiErr.message);
        recipes = sampleFallback(sign, meal, lang, count).recipes.map((r) => ({ ...r, id: `recipe_${nanoid(8)}`, sign, lang, notes: "fallback" }));
      }
    } else {
      recipes = sampleFallback(sign, meal, lang, count).recipes.map((r) => ({ ...r, id: `recipe_${nanoid(8)}`, sign, lang, notes: "fallback" }));
    }

    // Save recipes to Supabase if configured
    if (supabase) {
      // supabase expects objects shaped like your table; adapt if necessary
      const toInsert = recipes.map(r => ({
        id: r.id,
        title: r.title,
        sign: r.sign,
        lang: r.lang,
        ingredients: r.ingredients,
        steps: r.steps,
        nutrition: r.nutrition,
        poem: r.poem,
        notes: r.notes,
        created_at: new Date().toISOString(),
        author_email: email || null
      }));

      const { data, error } = await supabase.from("recipes").insert(toInsert).select();
      if (error) {
        console.warn("Supabase insert error:", error);
        // still return recipes but warn client
        return res.status(200).json({ warning: "Supabase insert failed", recipes });
      }
      // if insert returns rows with different ids, map them back
      if (Array.isArray(data) && data.length > 0) {
        // match by title or other unique keys if needed; here we simply return DB rows
        return res.status(200).json({ recipes: data });
      }
    }

    // If no supabase or insert not used, return the generated recipes
    return res.status(200).json({ recipes });
  } catch (err) {
    console.error("Server error in /api/chefai:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
