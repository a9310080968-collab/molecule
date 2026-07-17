import { ChevronDown, MessageCircle, Send } from "lucide-react";
import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types";

type ProjectChatPanelProps = {
  messages: ChatMessage[];
  isOpen: boolean;
  unreadCount: number;
  onSend: (text: string) => void;
  onToggle: () => void;
  onOpenChat: () => void;
};

type ChatFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function ProjectChatPanel({ messages, isOpen, unreadCount, onSend, onToggle, onOpenChat }: ProjectChatPanelProps) {
  const [value, setValue] = useState("");
  const [frame, setFrame] = useState(() => getInitialChatFrame());
  const panelRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    frame: ChatFrame;
  } | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setFrame((current) => {
        if (Math.abs(current.width - width) < 2 && Math.abs(current.height - height) < 2) {
          return current;
        }
        return clampChatFrame({ ...current, width, height });
      });
    });

    observer.observe(panel);
    return () => observer.disconnect();
  }, [isOpen]);

  function send() {
    const text = value.trim();
    if (!text) {
      return;
    }
    onSend(text);
    setValue("");
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("button, input")) {
      return;
    }

    const rect = panelRef.current?.getBoundingClientRect();
    const currentFrame = rect
      ? {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        }
      : frame;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      frame: currentFrame,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setFrame(clampChatFrame({
      ...drag.frame,
      x: drag.frame.x + event.clientX - drag.startX,
      y: drag.frame.y + event.clientY - drag.startY,
    }));
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  const panelStyle = {
    left: `${frame.x}px`,
    top: `${frame.y}px`,
    width: `${frame.width}px`,
    height: `${frame.height}px`,
  } satisfies CSSProperties;

  if (!isOpen) {
    return (
      <button className="project-chat-launcher glass-panel" onClick={onToggle} aria-label="Открыть мессенджер проекта">
        <MessageCircle size={19} />
        {unreadCount > 0 ? <span>{unreadCount}</span> : null}
      </button>
    );
  }

  return (
    <aside ref={panelRef} className="project-chat-panel glass-panel" style={panelStyle}>
      <header onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <button onClick={onOpenChat}>
          <MessageCircle size={17} />
          Мессенджер
        </button>
        <div className="project-chat-actions">
          <span>{unreadCount || messages.length}</span>
          <button className="project-chat-collapse" onClick={onToggle} aria-label="Свернуть мессенджер">
            <ChevronDown size={17} />
          </button>
        </div>
      </header>

      <div className="project-chat-feed">
        {messages.map((message) => (
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

function getInitialChatFrame(): ChatFrame {
  if (typeof window === "undefined") {
    return { x: 720, y: 360, width: 340, height: 270 };
  }

  const width = Math.min(380, Math.max(320, window.innerWidth - 64));
  const height = Math.min(360, Math.max(260, window.innerHeight - 160));
  return clampChatFrame({
    x: window.innerWidth - width - 340,
    y: window.innerHeight - height - 92,
    width,
    height,
  });
}

function clampChatFrame(frame: ChatFrame): ChatFrame {
  if (typeof window === "undefined") {
    return frame;
  }

  const width = Math.min(Math.max(frame.width, 300), Math.max(300, window.innerWidth - 32));
  const height = Math.min(Math.max(frame.height, 220), Math.max(220, window.innerHeight - 32));
  return {
    width,
    height,
    x: Math.min(Math.max(16, frame.x), Math.max(16, window.innerWidth - width - 16)),
    y: Math.min(Math.max(82, frame.y), Math.max(82, window.innerHeight - height - 16)),
  };
}
