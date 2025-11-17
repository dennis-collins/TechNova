import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const OLLAMA_BASE_URL =
  process.env.REACT_APP_OLLAMA_BASE_URL || "http://localhost:11434";

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: OLLAMA_BASE_URL,
});

const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabaseClient,
  tableName: "documents",
  queryName: "match_documents",
});

const retriever = vectorStore.asRetriever({
  k: 4,
});

// Prompt details.
const SYSTEM_PROMPT = `
Du är en kundtjänstassistent för TechNova AB, ett svenskt e-handelsföretag som säljer teknikprodukter online.

Du får:
- Kundens fråga
- Tidigare konversation (chat_history)
- Relevanta utdrag ur TechNova AB:s FAQ- och policydokument (context).

Viktiga regler:
- Svara alltid på svenska.
- Svara endast på frågor som rör TechNova AB, deras produkter, leveranser, garantier, kundsupport
  och innehållet i FAQ- och policydokumentet.
- Om kunden bara hälsar (t.ex. "Hej", "Hallå") ska du svara kort vänligt och berätta vad du kan hjälpa till med, utan att anta en specifik fråga.
- Anta inte vad kunden menar om frågan är oklar. Ställ i så fall en förtydligande fråga istället för att hitta på.
- Om frågan inte handlar om TechNova AB, deras produkter, leveranser, garantier eller policydokument:
  svara vänligt att du tyvärr bara kan svara på frågor om TechNova AB.
- Hitta inte på fakta. Om du inte hittar svaret i dokumenten, säg att du inte är säker.
- Om olika delar av dokumenten säger olika saker, förklara det tydligt.
`;


const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  new MessagesPlaceholder("chat_history"),
  [
    "human",
    `Kundens fråga:
{question}

Här är relevanta utdrag ur TechNova AB:s FAQ- och policydokument:
{context}

Instruktioner:
- Använd endast informationen i utdragen ovan (och tidigare konversation) när du svarar.
- Referera inte direkt till "context", utan skriv ett naturligt svar till kunden.
- Om frågan är utanför ditt område (t.ex. "Vad är JavaScript?"), förklara vänligt att du bara kan svara på frågor om TechNova AB.`,
  ],
]);

const model = new ChatOllama({
  model: "llama3",
  baseUrl: OLLAMA_BASE_URL,
  temperature: 0,
});

const qaChain = RunnableSequence.from([prompt, model]);

function mapChatHistory(messages) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) =>
      m.role === "user"
        ? new HumanMessage(m.content)
        : new AIMessage(m.content)
    );
}

function isGreetingOrSmalltalk(text) {
  const q = text.trim().toLowerCase();

  const stripped = q.replace(/[!?.]/g, "");

  const greetingWords = [
    "hej",
    "hejsan",
    "tjena",
    "hallå",
    "hi",
    "hello",
    "god morgon",
    "god kväll",
  ];

  if (greetingWords.includes(stripped)) {
    return true;
  }

  // Single very short words like "hej!" / "yo" / "hi?"
  if (stripped.split(/\s+/).length === 1 && stripped.length <= 4) {
    return true;
  }

  return false;
}


export async function askTechnova(question, chatHistory) {
  if (isGreetingOrSmalltalk(question)) {
    return {
      answer:
        "Hej! 👋 Jag är TechNova AB:s kundtjänstbot. Jag kan hjälpa dig med frågor om våra produkter, leveranser, garantier, retur- och återbetalningspolicy samt övriga delar av vårt FAQ- och policydokument. Vad vill du veta?",
      sources: [],
    };
  }

  const docs = await retriever.invoke(question);

  const contextText = docs
    .map((doc, i) => {
      const content = doc.pageContent || doc.content || "";
      return `Källa ${i + 1}:\n${content}`;
    })
    .join("\n\n");

  const lcHistory = mapChatHistory(chatHistory);

  const aiMessage = await qaChain.invoke({
    question,
    context: contextText,
    chat_history: lcHistory,
  });

  const answer = aiMessage.content;

  const sources = docs.slice(0, 2).map((doc, i) => ({
    id: doc.id,
    title:
      doc.metadata?.section ||
      `Källa ${i + 1} – TechNova AB FAQ/policy`,
    preview:
      doc.metadata?.preview ||
      (doc.pageContent || doc.content || "").slice(0, 160),
  }));

  return { answer, sources };
}
