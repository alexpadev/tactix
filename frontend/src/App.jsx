import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { UserContext } from './context/UserContext';
import { useApi } from './hooks/useApi';

import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import Inicio from './components/users/Inicio';
import UserList from './components/users/UserList';
import UserProfile from './components/users/UserProfile';
import { Profile } from './components/users/Profile';
import ChatList from './components/chat/ChatList';
import Chat from './components/chat/Chat';
import TeamsList from './components/teams/TeamsList';
import TeamDetails from './components/teams/TeamDetails';
import MiEquipo from './components/teams/MiEquipo';
import TeamCreate from './components/teams/TeamCreate';
import GamesList from './components/games/GamesList';
import GameCreate from './components/games/GameCreate';
import GameDetails from './components/games/GameDetails';
import GameEdit from './components/games/GameEdit';
import TournamentsList from './components/tournaments/TournamentsList';
import TournamentDetail from './components/tournaments/TournamentDetail';
import CreateTournament from './components/tournaments/CreateTournament';
import BracketView from './components/tournaments/BracketView';
import Map from './components/map/Map';
import 'leaflet/dist/leaflet.css';

function App() {
  const [token, setTokenState] = useState(localStorage.getItem("token2"));
  const [hasTeam, setHasTeam] = useState(false);

  const setToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem("token2", newToken);
    } else {
      localStorage.removeItem("token2");
    }
    setTokenState(newToken);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
  }, [setToken]);

  return (
    <UserContext.Provider value={{ token, setToken, logout, hasTeam, setHasTeam }}>
      <AuthInitializer />
      <Router>
        <Toaster />
        <Header />

        <MainRoutes />

        <ConditionalFooter />
      </Router>
    </UserContext.Provider>
  );
}

function MainRoutes() {
  const { token } = React.useContext(UserContext);

  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/teams" element={<TeamsList />} />
      <Route path="/teams/:id" element={<TeamDetails />} />
      <Route path="/users" element={<UserList />} />
      <Route path="/users/:id" element={<UserProfile />} />

      <Route
        path="/login"
        element={token ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={token ? <Navigate to="/" replace /> : <Register />}
      />

      {token ? (
        <>
          <Route path="/chats/:chatId?" element={<ChatList />} />
          <Route path="/chat/:chatId" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="/teams/new" element={<TeamCreate />} />
          <Route path="/teams/my" element={<MiEquipo />} />

          <Route path="/games" element={<GamesList />} />
          <Route path="/games/new" element={<GameCreate />} />
          <Route path="/games/:id" element={<GameDetails />} />
          <Route path="/games/:id/edit" element={<GameEdit />} />

          <Route path="/torneos" element={<TournamentsList />} />
          <Route path="/torneos/new" element={<CreateTournament />} />
          <Route path="/torneos/:id" element={<TournamentDetail />} />
          <Route path="/torneos/:id/bracket" element={<BracketView />} />

          <Route path="/map" element={<Map />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

function ConditionalFooter() {
  const { pathname } = useLocation();
  const noFooterOn = ['/login', '/register'];

  return noFooterOn.includes(pathname) ? null : <Footer />;
}

function AuthInitializer() {
  const { token, setHasTeam } = React.useContext(UserContext);
  const { apiFetch } = useApi();

  useEffect(() => {
    if (!token) {
      setHasTeam(false);
      return;
    }
    (async () => {
      try {
        const res = await apiFetch('/api/users/me/team');
        const team = await res.json();
        setHasTeam(team?.id || false);
      } catch {
        setHasTeam(false);
      }
    })();
  }, [token, apiFetch, setHasTeam]);

  return null;
}

export default App;
