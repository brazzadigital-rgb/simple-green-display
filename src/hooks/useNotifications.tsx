import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

export interface Notification {
  id: string;
  recipient_type: string;
  recipient_user_id: string;
  title: string;
  body: string;
  type: string;
  entity_type: string;
  entity_id: string | null;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  channel: string;
  data_json: any;
  created_at: string;
}

interface NotificationPreferences {
  enable_inapp: boolean;
  enable_push: boolean;
  enable_sound: boolean;
  sound_volume: number;
  quiet_hours_enabled: boolean;
  quiet_from: string;
  quiet_to: string;
  types_enabled_json: string[];
}

const DEFAULT_PREFS: NotificationPreferences = {
  enable_inapp: true,
  enable_push: false,
  enable_sound: false,
  sound_volume: 70,
  quiet_hours_enabled: false,
  quiet_from: "22:00",
  quiet_to: "08:00",
  types_enabled_json: ["order_new", "payment_paid", "order_shipped", "order_delivered", "refund", "stock_low", "system"],
};

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  isLoading: boolean;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  fetchMore: (cursor?: string, type?: string) => Promise<Notification[]>;
  playSound: () => void;
  playCustomerSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const prevUnreadRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef(false);

  // Track user interaction for sound
  useEffect(() => {
    const handler = () => { hasInteractedRef.current = true; };
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) setNotifications(data as Notification[]);
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", user.id)
      .eq("is_read", false);
    const newCount = count || 0;
    
    // Play sound if new notification arrived
    if (newCount > prevUnreadRef.current && preferences.enable_sound && hasInteractedRef.current) {
      playSound();
    }
    prevUnreadRef.current = newCount;
    setUnreadCount(newCount);
  }, [user, preferences.enable_sound]);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setPreferences({
        enable_inapp: data.enable_inapp,
        enable_push: data.enable_push,
        enable_sound: data.enable_sound,
        sound_volume: data.sound_volume,
        quiet_hours_enabled: data.quiet_hours_enabled,
        quiet_from: data.quiet_from,
        quiet_to: data.quiet_to,
        types_enabled_json: (data.types_enabled_json as string[]) || DEFAULT_PREFS.types_enabled_json,
      });
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    Promise.all([fetchNotifications(), fetchUnreadCount(), fetchPreferences()])
      .finally(() => setIsLoading(false));
  }, [user, fetchNotifications, fetchUnreadCount, fetchPreferences]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev].slice(0, 20));
        setUnreadCount(prev => {
          const next = prev + 1;
          if (preferences.enable_sound && hasInteractedRef.current) {
            if (newNotif.recipient_type === "admin" && newNotif.type === "payment_paid") {
              playSound();
            } else if (newNotif.recipient_type !== "admin") {
              playCustomerSound();
            }
          }
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, preferences.enable_sound]);

  // Polling fallback every 30s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  const playSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/new-order.mp3");
      }
      audioRef.current.volume = (preferences.sound_volume || 70) / 100;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, [preferences.sound_volume]);

  const playCustomerSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      const vol = (preferences.sound_volume || 70) / 100;

      const playTone = (freq: number, start: number, dur: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(vol * 0.3, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur);
      };

      playTone(880, 0, 0.15);
      playTone(1100, 0.12, 0.2);
    } catch {}
  }, [preferences.sound_volume]);

  const markAsRead = async (ids: string[]) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", ids);
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - ids.length));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("recipient_user_id", user.id)
      .eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => {
      const wasUnread = notifications.find(n => n.id === id && !n.is_read);
      return wasUnread ? Math.max(0, prev - 1) : prev;
    });
  };

  const updatePreferences = async (prefs: Partial<NotificationPreferences>) => {
    if (!user) return;
    const merged = { ...preferences, ...prefs };
    setPreferences(merged);
    await supabase.from("notification_preferences").upsert({
      user_id: user.id,
      ...merged,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  };

  const fetchMore = async (cursor?: string, type?: string): Promise<Notification[]> => {
    if (!user) return [];
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (cursor) query = query.lt("created_at", cursor);
    if (type) query = query.eq("type", type);
    const { data } = await query;
    return (data || []) as Notification[];
  };

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, preferences, isLoading,
      markAsRead, markAllAsRead, deleteNotification, updatePreferences, fetchMore, playSound, playCustomerSound,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
