import { create } from 'zustand';

interface FocusState {
  isActive: boolean;
  timeLeft: number; // in seconds
  totalTime: number; // initial time in seconds
  currentTaskId: string | null;
  sessionCount: number;
  totalSessions: number;
  startFocus: (taskId: string | null, durationMinutes: number) => void;
  stopFocus: () => void;
  tick: () => void;
  resetTimer: () => void;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  isActive: false,
  timeLeft: 25 * 60,
  totalTime: 25 * 60,
  currentTaskId: null,
  sessionCount: 2,
  totalSessions: 4,
  startFocus: (taskId, durationMinutes) => set({
    isActive: true,
    currentTaskId: taskId,
    timeLeft: durationMinutes * 60,
    totalTime: durationMinutes * 60
  }),
  stopFocus: () => set({ isActive: false }),
  tick: () => set((state) => {
    if (state.timeLeft <= 0) {
      return { isActive: false, timeLeft: 0 };
    }
    return { timeLeft: state.timeLeft - 1 };
  }),
  resetTimer: () => set((state) => ({
    timeLeft: state.totalTime,
    isActive: false
  }))
}));
