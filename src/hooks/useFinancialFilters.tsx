import { useState, useMemo } from "react";
import { subDays, startOfMonth, startOfYear, format } from "date-fns";

export type PeriodKey = "7d" | "30d" | "mtd" | "ytd" | "custom";

export function useFinancialFilters(defaultPeriod: PeriodKey = "30d") {
  const [period, setPeriod] = useState<PeriodKey>(defaultPeriod);
  const [customFrom, setCustomFrom] = useState<string>(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const dateRange = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to = now;

    switch (period) {
      case "7d":
        from = subDays(now, 7);
        break;
      case "30d":
        from = subDays(now, 30);
        break;
      case "mtd":
        from = startOfMonth(now);
        break;
      case "ytd":
        from = startOfYear(now);
        break;
      case "custom":
        from = new Date(customFrom);
        to = new Date(customTo);
        break;
      default:
        from = subDays(now, 30);
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      fromDate: from,
      toDate: to,
    };
  }, [period, customFrom, customTo]);

  return {
    period,
    setPeriod,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    dateRange,
  };
}
