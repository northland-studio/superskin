import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Gallery from './pages/Gallery';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import { useUserStore } from './stores/userStore';

function App() {
  const { isLoggedIn } = useUserStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!isLoggedIn ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!isLoggedIn ? <Register /> : <Navigate to="/" />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="editor" element={<Editor />} />
          <Route path="gallery" element={<Gallery />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
