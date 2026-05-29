import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text?: string;
  timestamp: Date;
  type: 'text' | 'options' | 'deadline-wizard' | 'report-view' | 'loading';
  payload?: any;
}

interface AiAssistantState {
  messages: ChatMessage[];
  isProcessing: boolean;
  inputValue: string;
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setInputValue: (inputValue: string) => void;
  resetChat: () => void;
}

const initialWelcomeMessage: ChatMessage = {
  id: 'welcome',
  sender: 'assistant',
  text: "Hey there! 👋 I'm your productivity assistant. I can help you schedule your tasks smartly or put together a daily report on how things went. What would you like to do?",
  timestamp: new Date(),
  type: 'options'
};

export const useAiAssistantStore = create<AiAssistantState>((set) => ({
  messages: [
    { ...initialWelcomeMessage }
  ],
  isProcessing: false,
  inputValue: '',
  setMessages: (updater) => set((state) => {
    const nextMessages = typeof updater === 'function' ? updater(state.messages) : updater;
    return { messages: nextMessages };
  }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setInputValue: (inputValue) => set({ inputValue }),
  resetChat: () => set({
    messages: [{ ...initialWelcomeMessage, timestamp: new Date() }],
    isProcessing: false,
    inputValue: ''
  })
}));
