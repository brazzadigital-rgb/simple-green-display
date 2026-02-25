import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { ScrollToTop } from "@/components/ScrollToTop";

import StoreLayout from "./layouts/StoreLayout";
import Index from "./pages/Index";
import ProductPage from "./pages/Product";
import CartPage from "./pages/Cart";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import ProductEditor from "./pages/admin/ProductEditor";
import Collections from "./pages/admin/Collections";
import StoreSettings from "./pages/admin/StoreSettings";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminCustomerDetail from "./pages/admin/AdminCustomerDetail";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminSections from "./pages/admin/AdminSections";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminVisualIdentity from "./pages/admin/AdminVisualIdentity";
import Placeholder from "./pages/admin/Placeholder";
import AdminSuppliers from "./pages/admin/AdminSuppliers";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminCommissions from "./pages/admin/AdminCommissions";
import AdminReports from "./pages/admin/AdminReports";
import AdminHeaderSettings from "./pages/admin/AdminHeaderSettings";
import AccountLayout from "./pages/account/AccountLayout";
import Orders from "./pages/account/Orders";
import OrderDetail from "./pages/account/OrderDetail";
import Favorites from "./pages/account/Favorites";
import Addresses from "./pages/account/Addresses";
import ProfileData from "./pages/account/ProfileData";
import SearchPage from "./pages/store/SearchPage";
import CollectionPage from "./pages/store/CollectionPage";
import CollectionsListPage from "./pages/store/CollectionsListPage";
import OffersPage from "./pages/store/OffersPage";
import AllProductsPage from "./pages/store/AllProductsPage";
import FaqPage from "./pages/store/FaqPage";
import ContactPage from "./pages/store/ContactPage";
import PoliciesPage from "./pages/store/PoliciesPage";
import CheckoutPage from "./pages/store/CheckoutPage";
import TrackOrderPage from "./pages/store/TrackOrderPage";
import SellerLayout from "./layouts/SellerLayout";
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerRegister from "./pages/seller/SellerRegister";
import SellerPending from "./pages/seller/SellerPending";
import SellerLinks from "./pages/seller/SellerLinks";
import SellerSales from "./pages/seller/SellerSales";
import SellerCustomers from "./pages/seller/SellerCustomers";
import SellerCommissions from "./pages/seller/SellerCommissions";
import SellerWithdrawals from "./pages/seller/SellerWithdrawals";
import SellerCoupons from "./pages/seller/SellerCoupons";
import SellerMaterials from "./pages/seller/SellerMaterials";
import SellerProfile from "./pages/seller/SellerProfile";
import SellerSupport from "./pages/seller/SellerSupport";
import AdminLogistics from "./pages/admin/AdminLogistics";
import AdminPaymentSettings from "./pages/admin/AdminPaymentSettings";
import AdminPromoPanels from "./pages/admin/AdminPromoPanels";
import AdminHomeTemplates from "./pages/admin/AdminHomeTemplates";
import AdminShowcases from "./pages/admin/AdminShowcases";
import AdminHeaderStyles from "./pages/admin/AdminHeaderStyles";
import AdminTracking from "./pages/admin/AdminTracking";
import AdminVariationTemplates from "./pages/admin/AdminVariationTemplates";
import AdminNotifications from "./pages/admin/AdminNotifications";
import CustomerNotifications from "./pages/account/Notifications";
import FinancialDashboard from "./pages/admin/financial/FinancialDashboard";
import FinancialSales from "./pages/admin/financial/FinancialSales";
import FinancialProducts from "./pages/admin/financial/FinancialProducts";
import FinancialCosts from "./pages/admin/financial/FinancialCosts";
import FinancialCommissions from "./pages/admin/financial/FinancialCommissions";
import FinancialRefunds from "./pages/admin/financial/FinancialRefunds";
import FinancialConciliation from "./pages/admin/financial/FinancialConciliation";
import FinancialCashflow from "./pages/admin/financial/FinancialCashflow";
import FinancialReports from "./pages/admin/financial/FinancialReports";
import FinancialSettings from "./pages/admin/financial/FinancialSettings";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminSubscription from "./pages/admin/AdminSubscription";
import OwnerLogin from "./pages/owner/OwnerLogin";
import OwnerLayout from "./layouts/OwnerLayout";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerSubscription from "./pages/owner/OwnerSubscription";
import OwnerPlans from "./pages/owner/OwnerPlans";
import OwnerInvoices from "./pages/owner/OwnerInvoices";
import OwnerAudit from "./pages/owner/OwnerAudit";
import OwnerSettings from "./pages/owner/OwnerSettings";
import OwnerAdmins from "./pages/owner/OwnerAdmins";

const queryClient = new QueryClient();

function AppContent() {

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<StoreLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/produto/:slug" element={<ProductPage />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route path="/busca" element={<SearchPage />} />
            <Route path="/colecoes" element={<CollectionsListPage />} />
            <Route path="/produtos" element={<AllProductsPage />} />
            <Route path="/colecao/:slug" element={<CollectionPage />} />
            <Route path="/ofertas" element={<OffersPage />} />
            <Route path="/contato" element={<ContactPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/politicas" element={<PoliciesPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/rastreamento" element={<TrackOrderPage />} />
            <Route path="/conta" element={<AccountLayout />}>
              <Route index element={<Orders />} />
              <Route path="pedidos" element={<Orders />} />
              <Route path="pedidos/:id" element={<OrderDetail />} />
              <Route path="favoritos" element={<Favorites />} />
              <Route path="enderecos" element={<Addresses />} />
              <Route path="notificacoes" element={<CustomerNotifications />} />
              <Route path="dados" element={<ProfileData />} />
            </Route>
          </Route>
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="produtos" element={<Products />} />
            <Route path="produtos/novo" element={<ProductEditor />} />
            <Route path="produtos/:id/editar" element={<ProductEditor />} />
            <Route path="colecoes" element={<Collections />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="pedidos/:id" element={<AdminOrderDetail />} />
            <Route path="clientes" element={<AdminCustomers />} />
            <Route path="clientes/:id" element={<AdminCustomerDetail />} />
            <Route path="cupons" element={<AdminCoupons />} />
            <Route path="secoes" element={<AdminSections />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="aparencia" element={<AdminVisualIdentity />} />
            <Route path="header" element={<AdminHeaderSettings />} />
            <Route path="configuracoes" element={<StoreSettings />} />
            <Route path="pagamentos" element={<AdminPaymentSettings />} />
            <Route path="vendedores" element={<AdminSellers />} />
            <Route path="fornecedores" element={<AdminSuppliers />} />
            <Route path="funcoes" element={<AdminRoles />} />
            <Route path="comissoes" element={<AdminCommissions />} />
            
            <Route path="relatorios" element={<AdminReports />} />
            <Route path="logistica" element={<AdminLogistics />} />
            <Route path="paineis-promo" element={<AdminPromoPanels />} />
            <Route path="home-templates" element={<AdminHomeTemplates />} />
            <Route path="vitrines" element={<AdminShowcases />} />
            <Route path="header-styles" element={<AdminHeaderStyles />} />
            <Route path="planos" element={<AdminPlans />} />
            <Route path="assinatura" element={<AdminSubscription />} />
            <Route path="rastreamento" element={<AdminTracking />} />
            <Route path="templates-variacoes" element={<AdminVariationTemplates />} />
            <Route path="notificacoes" element={<AdminNotifications />} />
            <Route path="financeiro" element={<FinancialDashboard />} />
            <Route path="financeiro/vendas" element={<FinancialSales />} />
            <Route path="financeiro/produtos" element={<FinancialProducts />} />
            <Route path="financeiro/custos" element={<FinancialCosts />} />
            <Route path="financeiro/comissoes" element={<FinancialCommissions />} />
            <Route path="financeiro/reembolsos" element={<FinancialRefunds />} />
            <Route path="financeiro/conciliacao" element={<FinancialConciliation />} />
            <Route path="financeiro/fluxo-caixa" element={<FinancialCashflow />} />
            <Route path="financeiro/relatorios" element={<FinancialReports />} />
            <Route path="financeiro/configuracoes" element={<FinancialSettings />} />
          </Route>
          <Route path="/vendedor/cadastro" element={<SellerRegister />} />
          <Route path="/vendedor" element={<SellerLayout />}>
            <Route index element={<SellerDashboard />} />
            <Route path="pendente" element={<SellerPending />} />
            <Route path="links" element={<SellerLinks />} />
            <Route path="vendas" element={<SellerSales />} />
            <Route path="clientes" element={<SellerCustomers />} />
            <Route path="comissoes" element={<SellerCommissions />} />
            <Route path="saques" element={<SellerWithdrawals />} />
            <Route path="cupons" element={<SellerCoupons />} />
            <Route path="materiais" element={<SellerMaterials />} />
            <Route path="perfil" element={<SellerProfile />} />
            <Route path="suporte" element={<SellerSupport />} />
          </Route>
          <Route path="/owner/login" element={<OwnerLogin />} />
          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<OwnerDashboard />} />
            <Route path="subscription" element={<OwnerSubscription />} />
            <Route path="plans" element={<OwnerPlans />} />
            <Route path="invoices" element={<OwnerInvoices />} />
            <Route path="admins" element={<OwnerAdmins />} />
            <Route path="audit" element={<OwnerAudit />} />
            <Route path="settings" element={<OwnerSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
