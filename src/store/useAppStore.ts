import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, RecordingState, Context, Notification, UserSettings } from '@/types';

interface AppState {
  // 用户状态
  user: User | null;
  isAuthenticated: boolean;
  
  // 录音状态
  recording: RecordingState;
  
  // 环境上下文
  context: Context;
  
  // 通知
  notifications: Notification[];
  
  // 用户设置
  settings: UserSettings;
  
  // 加载状态
  isLoading: boolean;
  
  // 错误状态
  error: string | null;
}

interface AppActions {
  // 用户操作
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  
  // 录音操作
  startRecording: () => void;
  stopRecording: () => void;
  setRecordingDuration: (duration: number) => void;
  setAudioBlob: (blob: Blob) => void;
  clearRecording: () => void;
  
  // 上下文操作
  setLocation: (location: Context['location']) => void;
  setWeather: (weather: Context['weather']) => void;
  setTimeOfDay: (timeOfDay: Context['timeOfDay']) => void;
  
  // 通知操作
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // 设置操作
  updateSettings: (settings: Partial<UserSettings>) => void;
  
  // 全局状态操作
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  recording: {
    isRecording: false,
    duration: 0,
  },
  context: {
    timeOfDay: 'morning',
  },
  notifications: [],
  settings: {
    theme: 'system',
    language: 'en',
    notifications: true,
    privacyLevel: 'public',
    imageStyle: 'abstract',
  },
  isLoading: false,
  error: null,
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // 用户操作
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        login: (user) => set({ user, isAuthenticated: true }),
        logout: () => set({ user: null, isAuthenticated: false }),
        
        // 录音操作
        startRecording: () => 
          set((state) => ({
            recording: { ...state.recording, isRecording: true, duration: 0 },
          })),
        
        stopRecording: () =>
          set((state) => ({
            recording: { ...state.recording, isRecording: false },
          })),
        
        setRecordingDuration: (duration) =>
          set((state) => ({
            recording: { ...state.recording, duration },
          })),
        
        setAudioBlob: (audioBlob) =>
          set((state) => ({
            recording: { 
              ...state.recording, 
              audioBlob,
              audioUrl: URL.createObjectURL(audioBlob),
            },
          })),
        
        clearRecording: () =>
          set((state) => ({
            recording: {
              isRecording: false,
              duration: 0,
              audioBlob: undefined,
              audioUrl: undefined,
            },
          })),
        
        // 上下文操作
        setLocation: (location) =>
          set((state) => ({
            context: { ...state.context, location },
          })),
        
        setWeather: (weather) =>
          set((state) => ({
            context: { ...state.context, weather },
          })),
        
        setTimeOfDay: (timeOfDay) =>
          set((state) => ({
            context: { ...state.context, timeOfDay },
          })),
        
        // 通知操作
        addNotification: (notification) => {
          const id = Date.now().toString();
          const newNotification = { ...notification, id };
          
          set((state) => ({
            notifications: [...state.notifications, newNotification],
          }));
          
          // 自动移除通知
          if (notification.duration !== 0) {
            setTimeout(() => {
              get().removeNotification(id);
            }, notification.duration || 5000);
          }
        },
        
        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),
        
        clearNotifications: () => set({ notifications: [] }),
        
        // 设置操作
        updateSettings: (newSettings) =>
          set((state) => ({
            settings: { ...state.settings, ...newSettings },
          })),
        
        // 全局状态操作
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
      }),
      {
        name: 'vomage-app-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          settings: state.settings,
        }),
      }
    ),
    {
      name: 'vomage-app-store',
    }
  )
);
