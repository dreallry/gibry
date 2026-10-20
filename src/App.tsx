import { useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { BackToTop } from "@/components/back-to-top";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoader } from "@/components/PageLoader";
import { useToast } from "@/components/Toast";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import HomePage from "@/pages/HomePage";

// Lazy load non-critical pages
const BooksPage = lazy(() => import("@/pages/BooksPage"));
const TransactionsPage = lazy(() => import("@/pages/TransactionsPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const LocationPage = lazy(() => import("@/pages/LocationPage"));
const AttendancePage = lazy(() => import("@/pages/AttendancePage"));
const HelpPage = lazy(() => import("@/pages/HelpPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const SocialPage = lazy(() => import("@/pages/SocialPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const BookClubsPage = lazy(() => import("@/pages/BookClubsPage"));
const BookClubChatPage = lazy(() => import("@/pages/BookClubChatPage"));
const NotesPage = lazy(() => import("@/pages/NotesPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const ReadingDashboard = lazy(() => import("@/pages/ReadingDashboard"));
const EventsPage = lazy(() => import("@/pages/EventsPage"));
const RewardsPage = lazy(() => import("@/pages/RewardsPage"));
const ScanPage = lazy(() => import("@/pages/ScanPage"));

import { useAuth } from "@/contexts/AuthContext";
import { checkUserUpcomingDeadlines, checkStreakAtRisk } from "@/lib/smartNotifications";

export default function App() {
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Smart proactive background checks (deadlines, streaks)
  useEffect(() => {
    if (user?.uid) {
      checkUserUpcomingDeadlines(user.uid).catch(() => { });
      checkStreakAtRisk(user.uid).catch(() => { });
    }
  }, [user?.uid]);

  // Achievement unlock listener
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.title) {
        toast("success", `Pencapaian baru: ${detail.title}!`);
      }
    };
    window.addEventListener("achievement-unlocked", handler);
    return () => window.removeEventListener("achievement-unlocked", handler);
  }, [toast]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <ErrorBoundary>
      <Layout>
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageLoader />}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomePage />} />
              <Route path="/books" element={<BooksPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/location" element={<LocationPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/help/:section" element={<HelpPage />} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
              <Route path="/social" element={<ProtectedRoute><SocialPage /></ProtectedRoute>} />
              <Route path="/chat/:userId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
              <Route path="/clubs" element={<ProtectedRoute><BookClubsPage /></ProtectedRoute>} />
              <Route path="/clubs/:clubId" element={<ProtectedRoute><BookClubChatPage /></ProtectedRoute>} />
              <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
              <Route path="/reading-dashboard" element={<ProtectedRoute><ReadingDashboard /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
              <Route path="/challenges" element={<Navigate to="/events" replace />} />
              <Route path="/rewards" element={<ProtectedRoute><RewardsPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
              <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
        <BackToTop />
      </Layout>
    </ErrorBoundary>
  );
}
