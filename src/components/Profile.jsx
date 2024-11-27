import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { FaTwitter, FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa';

// Imgur API bilgileri
const IMGUR_CLIENT_ID = 'ffd674a20801d6b';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [socialLinks, setSocialLinks] = useState({
    twitter: '',
    facebook: '',
    instagram: '',
    linkedin: ''
  });

  const socialIcons = {
    twitter: <FaTwitter className="text-[#1DA1F2]" />,
    facebook: <FaFacebook className="text-[#4267B2]" />,
    instagram: <FaInstagram className="text-[#E4405F]" />,
    linkedin: <FaLinkedin className="text-[#0A66C2]" />
  };

  const fetchProfile = async () => {
    if (!auth.currentUser) return;

    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setSocialLinks(data.socialLinks || {});
      } else {
        const userData = {
          firstName: auth.currentUser.displayName?.split(' ')[0] || '',
          lastName: auth.currentUser.displayName?.split(' ').slice(1).join(' ') || '',
          email: auth.currentUser.email,
          photoURL: auth.currentUser.photoURL,
          socialLinks: {
            twitter: '',
            facebook: '',
            instagram: '',
            linkedin: ''
          },
          createdAt: new Date()
        };
        
        await setDoc(docRef, userData);
        setProfile(userData);
        setSocialLinks(userData.socialLinks);
      }
    } catch (err) {
      console.error('Profil yüklenirken hata:', err);
      setError('Profil bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !auth.currentUser) return;

    try {
      setLoading(true);
      
      // Imgur'a yükle
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          Authorization: `Client-ID ${IMGUR_CLIENT_ID}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Profil fotoğrafı yüklenemedi');
      }

      const data = await response.json();
      const photoURL = data.data.link;

      await Promise.all([
        updateProfile(auth.currentUser, { photoURL }),
        updateDoc(doc(db, 'users', auth.currentUser.uid), { photoURL })
      ]);

      setProfile(prev => ({ ...prev, photoURL }));
    } catch (error) {
      console.error('Profil fotoğrafı yüklenirken hata:', error);
      setError('Profil fotoğrafı yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLinksUpdate = async () => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { socialLinks });
      setEditing(false);
      setProfile(prev => ({ ...prev, socialLinks }));
    } catch (error) {
      console.error('Sosyal medya bağlantıları güncellenirken hata:', error);
      setError('Sosyal medya bağlantıları güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (!auth.currentUser) {
    return <div className="text-center py-4">Lütfen giriş yapın.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
          <button
            onClick={() => {
              setError(null);
              fetchProfile();
            }}
            className="ml-2 text-sm underline"
          >
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.firstName}+${profile?.lastName}&background=random`}
                alt="Profil"
                className="w-32 h-32 rounded-full object-cover"
              />
              <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePhotoChange}
                  disabled={loading}
                />
                📷
              </label>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile?.firstName} {profile?.lastName}</h2>
              <p className="text-gray-600">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={() => auth.signOut()}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
          >
            Çıkış Yap
          </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Sosyal Medya Bağlantıları</h3>
            <button
              onClick={() => setEditing(!editing)}
              className="text-blue-500 hover:text-blue-700 transition-colors"
              disabled={loading}
            >
              {editing ? 'İptal' : 'Düzenle'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-4">
              {Object.entries(socialLinks).map(([platform, link]) => (
                <div key={platform} className="flex items-center space-x-2">
                  <span className="w-6">{socialIcons[platform]}</span>
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => setSocialLinks(prev => ({ ...prev, [platform]: e.target.value }))}
                    className="flex-1 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} profilinizin URL'si`}
                    disabled={loading}
                  />
                </div>
              ))}
              <button
                onClick={handleSocialLinksUpdate}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(socialLinks).map(([platform, link]) => (
                link && (
                  <a
                    key={platform}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <span className="w-6">{socialIcons[platform]}</span>
                    <span className="capitalize">{platform}</span>
                  </a>
                )
              ))}
              {Object.values(socialLinks).every(link => !link) && (
                <p className="text-gray-500">Henüz sosyal medya bağlantısı eklenmemiş.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}