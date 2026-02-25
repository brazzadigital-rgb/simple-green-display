import { useLocation } from "react-router-dom";

export default function Placeholder() {
  const { pathname } = useLocation();
  const name = pathname.split("/").pop() || "";
  const title = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
      <p className="font-display text-2xl mb-2">{title}</p>
      <p className="font-sans text-sm">Em breve — será implementado nas próximas fases.</p>
    </div>
  );
}
