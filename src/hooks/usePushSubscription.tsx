import { useState, useEffect, useCallback } from "react";

// Push Manager types are handled via 'any' casts
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = '';
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function usePushSubscription() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Check support
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Load VAPID public key from store_settings
  useEffect(() => {
    const loadKey = async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "vapid_public_key")
        .maybeSingle();
      if (data?.value) setVapidPublicKey(data.value);
    };
    loadKey();
  }, []);

  // Check current subscription status
  useEffect(() => {
    if (!isSupported || !user) return;
    const checkSub = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        if (reg) {
          const sub = await (reg as any).pushManager.getSubscription();
          setIsSubscribed(!!sub);
        }
      } catch {}
    };
    checkSub();
  }, [isSupported, user]);

  const subscribe = useCallback(async () => {
    if (!user || !vapidPublicKey || !isSupported) return false;
    setLoading(true);
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setLoading(false);
        return false;
      }

      // Subscribe
      const sub = await (reg as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh || '';
      const auth = json.keys?.auth || '';

      // Save to DB
      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,endpoint" });

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Push subscribe error:", err);
      setLoading(false);
      return false;
    }
  }, [user, vapidPublicKey, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (reg) {
        const sub = await (reg as any).pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          // Deactivate in DB
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("user_id", user.id)
            .eq("endpoint", sub.endpoint);
        }
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    }
    setLoading(false);
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    vapidPublicKey,
    subscribe,
    unsubscribe,
  };
}
