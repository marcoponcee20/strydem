import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Flame } from "lucide-react";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Workouts = lazy(() => import("./pages/Workouts"));
const NewWorkout = lazy(() => import("./pages/NewWorkout"));
const Plan = lazy(() => import("./pages/Plan"));
const Stats = lazy(() => import("./pages/Stats"));
const Profile = lazy(() => import("./pages/Profile"));
const Coach = lazy(() => import("./pages/Coach"));
const Discover = lazy(() => import("./pages/Discover"));
const Records = lazy(() => import("./pages/Records"));
const UserProfile = lazy(() => import("./pages/UserProfile"));

const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

const PageFallback = () => (
  <div className="min-h-[50vh] grid place-items-center">
    <Flame className="h-8 w-8 text-primary animate-pulse" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="workouts" element={<Workouts />} />
              <Route path="workouts/new" element={<NewWorkout />} />
              <Route path="plan" element={<Plan />} />
              <Route path="stats" element={<Stats />} />
              <Route path="coach" element={<Coach />} />
              <Route path="records" element={<Records />} />
              <Route path="discover" element={<Discover />} />
              <Route path="u/:id" element={<UserProfile />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
