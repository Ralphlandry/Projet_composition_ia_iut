import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Exams from "./pages/Exams";
import CreateExam from "./pages/CreateExam";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Corrections from "./pages/Corrections";
import MyExams from "./pages/MyExams";
import MyResults from "./pages/MyResults";
import TakeExam from "./pages/TakeExam";
import ExamSubmissions from "./pages/ExamSubmissions";
import GradesBySubject from "./pages/prof/GradesBySubject";
import GradesAllSubjects from "./pages/prof/GradesAllSubjects";
import AdminUsers from "./pages/admin/Users";
import AdminSubjects from "./pages/admin/Subjects";
import AdminSpecialties from "./pages/admin/Specialties";
import AdminLevels from "./pages/admin/Levels";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SendNotifications from "./pages/admin/SendNotifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'professeur' | 'etudiant'>;
}) => {
  const { user, role, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !role) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'professeur') return <Navigate to="/prof" replace />;
    return <Navigate to="/etudiant" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, role, loading } = useAuth();

  const defaultRoute = (() => {
    if (!user) return '/auth';
    if (role === 'admin') return '/admin';
    if (role === 'professeur') return '/prof';
    return '/etudiant';
  })();

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  if (user && !role) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to={defaultRoute} replace /> : <Auth />} />
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />

      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Navigate to="/admin/dashboard" replace /></ProtectedRoute>} />
      <Route path="/prof" element={<ProtectedRoute allowedRoles={['professeur', 'admin']}><Navigate to="/dashboard" replace /></ProtectedRoute>} />
      <Route path="/etudiant" element={<ProtectedRoute allowedRoles={['etudiant']}><Navigate to="/my-exams" replace /></ProtectedRoute>} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/exams" element={<ProtectedRoute allowedRoles={['professeur', 'admin']}><Exams /></ProtectedRoute>} />
      <Route path="/exams/create" element={<ProtectedRoute allowedRoles={['professeur', 'admin']}><CreateExam /></ProtectedRoute>} />
      <Route path="/exams/:id/edit" element={<ProtectedRoute allowedRoles={['professeur', 'admin']}><CreateExam /></ProtectedRoute>} />
      <Route path="/exams/:id/submissions" element={<ProtectedRoute allowedRoles={['professeur', 'admin']}><ExamSubmissions /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute allowedRoles={['professeur', 'admin']}><Analytics /></ProtectedRoute>} />
      <Route path="/grades/subject" element={<ProtectedRoute allowedRoles={['professeur', 'admin']}><GradesBySubject /></ProtectedRoute>} />
      <Route path="/grades/all-subjects" element={<ProtectedRoute allowedRoles={['professeur', 'admin']}><GradesAllSubjects /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/corrections/:id" element={<ProtectedRoute><Corrections /></ProtectedRoute>} />
      
      {/* Student routes */}
      <Route path="/my-exams" element={<ProtectedRoute allowedRoles={['etudiant']}><MyExams /></ProtectedRoute>} />
      <Route path="/my-results" element={<ProtectedRoute allowedRoles={['etudiant']}><MyResults /></ProtectedRoute>} />
      <Route path="/take-exam/:id" element={<ProtectedRoute allowedRoles={['etudiant']}><TakeExam /></ProtectedRoute>} />
      
      {/* Admin routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/filieres" element={<ProtectedRoute allowedRoles={['admin']}><AdminSpecialties /></ProtectedRoute>} />
      <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={['admin']}><AdminSubjects /></ProtectedRoute>} />
      <Route path="/admin/levels" element={<ProtectedRoute allowedRoles={['admin']}><AdminLevels /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><SendNotifications /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
