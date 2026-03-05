import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Welcome from "./pages/Welcome";
import LanguageSelection from "./pages/LanguageSelection";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/modules/Documents";
import Banking from "./pages/modules/Banking";
import Insurance from "./pages/modules/Insurance";
import Health from "./pages/modules/Health";
import IncomeSavings from "./pages/modules/IncomeSavings";
import Expenses from "./pages/modules/Expenses";
import Emergency from "./pages/modules/Emergency";
import Reminders from "./pages/modules/Reminders";
import Lending from "./pages/modules/Lending";
import MonthlyConfirmation from "./pages/modules/MonthlyConfirmation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TranslationProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/welcome" replace />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/language" element={<LanguageSelection />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/modules/documents" element={<Documents />} />
                <Route path="/modules/banking" element={<Banking />} />
                <Route path="/modules/insurance" element={<Insurance />} />
                <Route path="/modules/health" element={<Health />} />
                <Route path="/modules/income" element={<IncomeSavings />} />
                <Route path="/modules/expenses" element={<Expenses />} />
                <Route path="/modules/emergency" element={<Emergency />} />
                <Route path="/modules/reminders" element={<Reminders />} />
                <Route path="/modules/lending" element={<Lending />} />
                <Route path="/modules/monthly" element={<MonthlyConfirmation />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </TranslationProvider>
  </QueryClientProvider>
);

export default App;
