import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PeriodKey } from "@/hooks/useFinancialFilters";

interface PeriodFilterProps {
  period: PeriodKey;
  setPeriod: (p: PeriodKey) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
}

const periodLabels: Record<PeriodKey, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "mtd": "Mês atual",
  "ytd": "Ano atual",
  "custom": "Personalizado",
};

export function PeriodFilter({ period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo }: PeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
        <SelectTrigger className="w-[180px] bg-card border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(periodLabels).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {period === "custom" && (
        <div className="flex items-center gap-2">
          <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-[150px] bg-card" />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-[150px] bg-card" />
        </div>
      )}
    </div>
  );
}
