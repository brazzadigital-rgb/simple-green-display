import { useSearchParams } from "react-router-dom";
import { useHomeTemplate, type HeaderStyle } from "@/hooks/useHomeTemplate";
import { StoreHeader } from "@/components/store/StoreHeader";
import { HeaderBoutiqueClean } from "@/components/store/headers/HeaderBoutiqueClean";
import { HeaderVinhoPremium } from "@/components/store/headers/HeaderVinhoPremium";
import { HeaderGlassLuxury } from "@/components/store/headers/HeaderGlassLuxury";
import { HeaderEditorialMinimal } from "@/components/store/headers/HeaderEditorialMinimal";
import { HeaderCompactSticky } from "@/components/store/headers/HeaderCompactSticky";

const headerMap: Record<HeaderStyle, React.ComponentType> = {
  default: StoreHeader,
  boutique_clean: HeaderBoutiqueClean,
  vinho_premium: HeaderVinhoPremium,
  glass_luxury: HeaderGlassLuxury,
  editorial_minimal: HeaderEditorialMinimal,
  compact_sticky: HeaderCompactSticky,
};

export function StoreHeaderRouter() {
  const { headerStyle } = useHomeTemplate();
  const [searchParams] = useSearchParams();

  // Allow preview override via query param (admin preview)
  const previewHeader = searchParams.get("preview_header") as HeaderStyle | null;
  const activeStyle = previewHeader && headerMap[previewHeader] ? previewHeader : headerStyle;

  const HeaderComponent = headerMap[activeStyle] || StoreHeader;
  return <HeaderComponent />;
}
