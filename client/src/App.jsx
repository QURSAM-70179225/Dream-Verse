import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Loader from './components/ui/Loader.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import RouteEffects from './components/layout/RouteEffects.jsx';
import SlowRequestNotice from './components/ui/SlowRequestNotice.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const DemoWorld = lazy(() => import('./pages/DemoWorld.jsx'));
const SetupStatus = lazy(() => import('./pages/SetupStatus.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const CreateFuture = lazy(() => import('./pages/CreateFuture.jsx'));
const World = lazy(() => import('./pages/World.jsx'));
const Nova = lazy(() => import('./pages/Nova.jsx'));
const Roadmap = lazy(() => import('./pages/Roadmap.jsx'));
const Decisions = lazy(() => import('./pages/Decisions.jsx'));
const Achievements = lazy(() => import('./pages/Achievements.jsx'));

export default function App() {
  return (
    <Suspense fallback={<Loader label="Loading DreamVerse" />}>
      <RouteEffects />
      <SlowRequestNotice />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/demo-world" element={<DemoWorld />} />
          <Route path="/status" element={<SetupStatus />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreateFuture />} />
            <Route path="/nova" element={<Nova />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/decisions" element={<Decisions />} />
            <Route path="/achievements" element={<Achievements />} />
          </Route>
          {/* The walkable world is full screen, so it sits outside the sidebar layout. */}
          <Route path="/world" element={<World />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
