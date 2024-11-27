import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Auth({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Bu e-posta adresi zaten kullanımda.';
      case 'auth/invalid-email':
        return 'Geçersiz e-posta adresi.';
      case 'auth/operation-not-allowed':
        return 'E-posta/şifre girişi etkin değil.';
      case 'auth/weak-password':
        return 'Şifre çok zayıf. En az 6 karakter kullanın.';
      case 'auth/user-disabled':
        return 'Bu hesap devre dışı bırakılmış.';
      case 'auth/user-not-found':
        return 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.';
      case 'auth/wrong-password':
        return 'Hatalı şifre.';
      default:
        return 'Bir hata oluştu. Lütfen tekrar deneyin.';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      if (resetMode) {
        await sendPasswordResetEmail(auth, email);
        setSuccessMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
        return;
      }

      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Kullanıcı bilgilerini Firestore'dan al
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Kullanıcı nesnesini güncelle
          userCredential.user.isModerator = userData.isModerator || false;
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Kullanıcı profilini güncelle
        await updateProfile(user, {
          displayName: `${firstName} ${lastName}`
        });

        // Firestore'da kullanıcı dokümanı oluştur
        await setDoc(doc(db, 'users', user.uid), {
          firstName,
          lastName,
          email,
          photoURL: null,
          isModerator: false,
          socialLinks: {
            twitter: '',
            facebook: '',
            instagram: '',
            linkedin: ''
          },
          createdAt: new Date()
        });
      }
      onSuccess?.();
    } catch (err) {
      setError(getErrorMessage(err.code));
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMessage('');
    setResetMode(false);
  };

  const toggleResetMode = () => {
    setResetMode(!resetMode);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {resetMode ? 'Şifre Sıfırlama' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
        </h2>
        {error && (
          <p className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded">{error}</p>
        )}
        {successMessage && (
          <p className="text-green-500 text-sm mt-2 p-2 bg-green-50 rounded">{successMessage}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && !resetMode && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Soyad
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-posta Adresi
          </label>
          <input
            type="email"
            required
            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="ornek@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {!resetMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {resetMode ? 'Şifre Sıfırlama Bağlantısı Gönder' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
        </button>
      </form>

      <div className="flex flex-col space-y-2 text-sm text-center">
        {!resetMode && (
          <button
            onClick={toggleMode}
            className="text-blue-600 hover:text-blue-800"
          >
            {isLogin ? 'Hesap oluştur' : 'Zaten hesabın var mı? Giriş yap'}
          </button>
        )}
        
        <button
          onClick={toggleResetMode}
          className="text-blue-600 hover:text-blue-800"
        >
          {resetMode ? 'Giriş sayfasına dön' : 'Şifremi unuttum'}
        </button>
      </div>
    </div>
  );
}