import React, { useState } from "react";
import "./App.css";
import { askTechnova } from "./ai/technovaClient";

function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hej! Jag är TechNova AB:s kundtjänstbot. Jag kan svara på frågor om våra produkter, leveranser, garantier och policydokument. Vad vill du veta?",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setErrorText("");

    const userMessage = { role: "user", content: trimmed };
    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");

    try {
      setIsLoading(true);

      const { answer, sources } = await askTechnova(trimmed, newHistory);

      const assistantMessage = {
        role: "assistant",
        content: answer,
        sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setErrorText(
        "Något gick fel när jag försökte prata med AI-tjänsten. Kontrollera att Ollama är igång och försök igen."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>TechNova AB – Kundtjänstbot</h1>

      <div className="chat-window">
        {messages.map((m, index) => (
          <div
            key={index}
            className={`message message--${m.role}`}
          >
            <div className="message-role">
              {m.role === "user" ? "Du" : "Bot"}
            </div>
            <div className="message-content">
              {m.content}
              {}
              {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                <div className="message-sources">
                  <div className="sources-title">Källor:</div>
                  <ul>
                    {m.sources.map((s, i) => (
                      <li key={i}>
                        <strong>{s.title}</strong> – {s.preview}…
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {errorText && <div className="error-text">{errorText}</div>}

      <form className="input-row" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Skriv din fråga här..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Tänker..." : "Skicka"}
        </button>
      </form>
    </div>
  );
}

export default App;
