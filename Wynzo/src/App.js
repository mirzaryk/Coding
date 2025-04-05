import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminWinners from './pages/admin/AdminWinners';
import AdminDraws from './pages/admin/AdminDraws';
import AdminStats from './pages/admin/AdminStats';
import AdminPrizeClaims from './pages/admin/AdminPrizeClaims';
import AdminDeposits from './pages/admin/AdminDeposits';
import AdminTasks from './pages/admin/AdminTasks'; // Import the AdminTasks component
import UserProfile from './pages/user/UserProfile';
import UserEntries from './pages/user/UserEntries';
import UserWalletData from './pages/user/UserWalletData';
import PreviousDraws from './pages/PreviousDraws';
import Faq from './pages/Faq';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy'; 
import Tasks from './pages/Tasks';
import NotFound from './pages/NotFound';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  const { currentUser } = useAuth();

  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/previous-draws" element={<PreviousDraws />} /> {/* No authentication required */}
          <Route path="/faq" element={<Faq />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} /> {/* Add the new route for Privacy Policy */}
          <Route path="/tasks" element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } />
          <Route path="/my-entries" element={
            <ProtectedRoute>
              <UserEntries />
            </ProtectedRoute>
          } />
          <Route path="/wallet" element={
            <ProtectedRoute>
              <UserWalletData />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          } />
          <Route path="/admin/winners" element={
            <AdminRoute>
              <AdminWinners />
            </AdminRoute>
          } />
          <Route path="/admin/draws" element={
            <AdminRoute>
              <AdminDraws />
            </AdminRoute>
          } />
          <Route path="/admin/stats" element={
            <AdminRoute>
              <AdminStats />
            </AdminRoute>
          } />
          <Route path="/admin/claims" element={
            <AdminRoute>
              <AdminPrizeClaims />
            </AdminRoute>
          } />
          <Route path="/admin/deposits" element={
            <AdminRoute>
              <AdminDeposits />
            </AdminRoute>
          } />
          <Route path="/admin/tasks" element={
            <AdminRoute>
              <AdminTasks />
            </AdminRoute>
          } />
          <Route path="/admin/users/:userId?" element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default App;
