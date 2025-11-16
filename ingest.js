const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Ollama embeddings endpoint
const OLLAMA_EMBED_URL = "http://localhost:11434/api/embed";

async function embedText(text) {
  const response = await fetch(OLLAMA_EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ollama embedding failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();

  const embedding = data.embeddings && data.embeddings[0];

  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    console.error("Bad embedding response from Ollama:", data);
    throw new Error("No valid embedding returned from Ollama");
  }

  return embedding;
}

function chunkText(rawText) {
  const paragraphs = rawText
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paragraphs;
}

async function main() {
  const filePath = path.join(__dirname, "data", "faq.txt");
  const rawText = fs.readFileSync(filePath, "utf8");

  const chunks = chunkText(rawText);
  console.log(`Found ${chunks.length} chunks to insert.`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  for (const [index, content] of chunks.entries()) {
    console.log(`\n[${index + 1}/${chunks.length}] Embedding chunk...`);

    const metadata = {
      source: "TechNova AB – FAQ & Policydokument",
      preview: content.slice(0, 120),
    };

    const embedding = await embedText(content);

    const { error } = await supabase.from("documents").insert({
      content,
      metadata,
      embedding,
    });

    if (error) {
      console.error("Error inserting chunk:", error);
      process.exit(1);
    }

    console.log(`Inserted chunk ${index + 1}`);
  }

  console.log("\n🎉 Done ingesting TechNova FAQ & policy into Supabase.");
}

main().catch((err) => {
  console.error("Unexpected error in ingest.js:", err);
  process.exit(1);
});
