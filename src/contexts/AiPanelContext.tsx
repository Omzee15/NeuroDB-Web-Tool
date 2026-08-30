"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: AiMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
  pushAssistantMessage: (content: string) => void;
}

const AiPanelContext = createContext<AiPanelContextValue | null>(null);

export function AiPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);

  const pushAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content }]);
    setOpen(true);
  }, []);

  return (
    <AiPanelContext.Provider value={{ open, setOpen, messages, setMessages, pushAssistantMessage }}>
      {children}
    </AiPanelContext.Provider>
  );
}

export function useAiPanel(): AiPanelContextValue {
  const ctx = useContext(AiPanelContext);
  if (!ctx) throw new Error("useAiPanel must be used within AiPanelProvider");
  return ctx;
}
