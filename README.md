# TechNova AB – Kundtjänstbot
En AI-baserad kundsupportassistent byggd med React, LangChain.js, Supabase och Ollama som kan svara på frågor om TechNova AB:s produkter, leveranser, garantier samt företagets FAQ- och policydokument.

---

## Teknikstack

- React (Create React App)
- LangChain.js
  - PromptTemplates / ChatPromptTemplates
  - RunnableSequence
  - SupabaseVectorStore (Retriever)
- Supabase (Postgres + pgvector)
- Ollama (lokal LLM: llama3 + nomic-embed-text)
- Node.js (för ingest-skriptet)

- Supabase table syns här:
<img width="1043" height="765" src="https://github.com/user-attachments/assets/73f9c991-1de4-4daa-b194-c3c5934fc229" />

---

## Installation & Körning

### 1. Installera beroenden
```
npm install
```

### 2. Installera modeller i Ollama

Se till att Ollama är installerat.
Installera modellerna:
```
ollama pull llama3
ollama pull nomic-embed-text
```

### 3. Kör ingest-skriptet (behövs endast första gången)
```
node ingest.js
```

Detta skapar embeddings från `data/faq.txt` och laddar upp dem till Supabase-tabellen `documents`.

### 4. Starta applikationen
```
npm start
```

Öppna sedan:
http://localhost:3000

---

## Testa funktionalitet

### Hälsningar
- "Hej!"
- "Hejsan!"

Förväntat: vänligt svar, inga källor.

### TechNova-frågor
- "Hur lång är leveranstiden?"
- "Erbjuder ni garanti?"
- "Hur fungerar ångerrätten?"
- "Levererar ni utanför Sverige?"

Förväntat: korrekta svar + relevanta källor.

### Ej tillåtet område
- "Var är Budapest?"
- "Hur blir man utvecklare?"

Förväntat:
Bot förklarar att den endast kan svara på frågor som rör TechNova AB.

---

## Om .env.local och nycklar

I en riktig produktionsmiljö ska service_role-nyckeln aldrig publiceras. Men för detta utbildningsprojekt bestämde jag att inkludera `.env.local` i inlämningen för att man ska kunna köra projektet utan extra konfiguration.

Filen innehåller:
```
REACT_APP_SUPABASE_URL=...
REACT_APP_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
REACT_APP_OLLAMA_BASE_URL=http://localhost:11434
```

I en riktig produktion som inte var en del av en utbildning skulle denna fil läggas i `.gitignore`.

---

