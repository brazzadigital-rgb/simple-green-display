import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const COOKIE_KEY = "seller_ref";
const COOKIE_DAYS = 30;

export function useSellerReferral() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      const expires = new Date();
      expires.setDate(expires.getDate() + COOKIE_DAYS);
      document.cookie = `${COOKIE_KEY}=${encodeURIComponent(ref)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    }
  }, [searchParams]);

  const getReferralCode = (): string | null => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  };

  const clearReferral = () => {
    document.cookie = `${COOKIE_KEY}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  };

  return { getReferralCode, clearReferral };
}
