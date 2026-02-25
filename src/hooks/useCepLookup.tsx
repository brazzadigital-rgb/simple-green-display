import { useState, useCallback } from "react";

interface CepResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export function useCepLookup() {
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (cep: string): Promise<CepResult | null> => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return null;
    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) return null;
      return {
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      };
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading };
}
