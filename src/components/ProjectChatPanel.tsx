import { MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import type { ChatMessage } from "../types";

type ProjectChatPanelProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onOpenChat: () => void;
};

export function ProjectChatPanel({ messages, onSend, onOpenChat }: ProjectChatPanelProps) {
  const [value, setValue] = useState("");

  function send() {
    const text = value.trim();
    if (!text) {
      return;
    }
    onSend(text);
    setValue("");
  }

  return (
    <aside className="project-chat-panel glass-panel">
      <header>
        <button onClick={onOpenChat}>
          <MessageCircle size={17} />
          Мессенджер
        </button>
        <span>{messages.length}</span>
      </header>

      <div className="project-chat-feed">
        {messages.slice(0, 2).map((message) => (
          <article key={message.id}>
            <b>{message.author}</b>
            <span>{message.role} · {message.time}</span>
            <p>{message.text}</p>
          </article>
        ))}
      </div>

      <footer>
        <input
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Сообщение в проект..."
        />
        <button onClick={send} aria-label="Отправить сообщение в мессенджер">
          <Send size={16} />
        </button>
      </footer>
    </aside>
  );
}
