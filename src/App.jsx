import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Auth from './components/Auth';
import Profile from './components/Profile';
import BlogList from './components/BlogList';
import CreateBlog from './components/CreateBlog';
import UserProfile from './components/UserProfile';
import BlogDetail from './components/BlogDetail';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateBlog, setShowCreateBlog] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <Link 
                to="/"
                className="flex items-center space-x-2 text-xl font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <img 
                  src="https://i.ibb.co/QYGymd9/habersinlogo.png" 
                  alt="Habersin Logo" 
                  className="h-8 w-auto"
                />
                <div className="flex flex-col">
                  <span>Habersin</span>
                  <span className="text-xs text-gray-500">Sinop'un haberi sensin.</span>
                </div>
              </Link>

              <div className="flex-1 max-w-lg mx-4 relative">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg 
                      className="h-5 w-5 text-gray-400" 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder=""
                    className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowContact(!showContact)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                >
                  İletişim
                </button>
                {user ? (
                  <Link
                    to="/profile"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  >
                    Profilim
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  >
                    Giriş Yap / Kayıt Ol
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto py-8">
          <Routes>
            <Route path="/" element={
              <>
                {user && (
                  <div className="text-center mb-8">
                    <button
                      onClick={() => setShowCreateBlog(true)}
                      className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors text-lg font-semibold"
                    >
                      Bir Haberim Var!
                    </button>
                  </div>
                )}
                <h2 className="text-2xl font-bold text-center mb-8">Gündem</h2>
                <BlogList searchQuery={searchQuery} />
              </>
            } />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
            <Route path="/user/:userId" element={<UserProfile />} />
            <Route path="/blog/:id" element={<BlogDetail setShowAuth={setShowAuth} />} />
          </Routes>

          {showCreateBlog && user && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Haberi Paylaş</h2>
                  <button
                    onClick={() => setShowCreateBlog(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <CreateBlog onClose={() => setShowCreateBlog(false)} />
              </div>
            </div>
          )}

          {showAuth && !user && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-8 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Giriş Yap / Kayıt Ol</h2>
                  <button
                    onClick={() => setShowAuth(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <Auth onSuccess={() => setShowAuth(false)} />
              </div>
            </div>
          )}

          {showContact && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-8 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">İletişim</h2>
                  <button
                    onClick={() => setShowContact(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">📧</span>
                    <a href="mailto:iletisim@habersin.tr" className="text-blue-600 hover:text-blue-800">
                      iletisim@habersin.tr
                    </a>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">📧</span>
                    <a href="mailto:iletisim@habersin.info" className="text-blue-600 hover:text-blue-800">
                      iletisim@habersin.info
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </Router>
  );
}