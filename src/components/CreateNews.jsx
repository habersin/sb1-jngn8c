import React, { useState } from 'react';
import { db, storage, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function CreateNews({ onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      setError('Lütfen önce giriş yapın');
      return;
    }

    if (images.length === 0 || images.length > 3) {
      setError('Lütfen 1-3 arası görsel seçin');
      return;
    }

    // Her bir görsel için 20MB limit
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const hasLargeFile = Array.from(images).some(file => file.size > MAX_FILE_SIZE);
    if (hasLargeFile) {
      setError('Görseller 20MB\'dan küçük olmalıdır');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Görselleri yükle
      const imageUrls = await Promise.all(
        Array.from(images).map(async (image) => {
          const fileRef = ref(storage, `news/${Date.now()}-${image.name}`);
          const snapshot = await uploadBytes(fileRef, image);
          return getDownloadURL(snapshot.ref);
        })
      );

      // Haberi veritabanına ekle
      const newsData = {
        title,
        description,
        location,
        imageUrls,
        createdAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'İsimsiz Kullanıcı',
        views: 0,
        likes: 0,
        dislikes: 0
      };

      await addDoc(collection(db, 'news'), newsData);

      // Formu temizle
      setTitle('');
      setDescription('');
      setLocation('');
      setImages([]);

      alert('Haber başarıyla paylaşıldı!');
      onClose();
    } catch (err) {
      console.error('Haber paylaşma hatası:', err);
      setError('Haber paylaşılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      setError('En fazla 3 görsel seçebilirsiniz');
      e.target.value = '';
      return;
    }
    setImages(files);
    setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Başlık</label>
        <input
          type="text"
          required
          className="mt-1 block w-full px-3 py-2 border rounded-md"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Açıklama</label>
        <textarea
          required
          className="mt-1 block w-full px-3 py-2 border rounded-md"
          rows="4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Konum</label>
        <input
          type="text"
          required
          className="mt-1 block w-full px-3 py-2 border rounded-md"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Örn: İstanbul, Kadıköy"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Görseller (1-3 arası seçin)
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="mt-1 block w-full"
          required
        />
        <p className="mt-1 text-sm text-gray-500">
          Her görsel en fazla 20MB olabilir. JPG, PNG ve GIF formatları desteklenir.
        </p>
        {images.length > 0 && (
          <p className="mt-1 text-sm text-green-600">
            {images.length} görsel seçildi
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 px-4 rounded-md ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading ? 'Paylaşılıyor...' : 'Haberi Paylaş'}
      </button>
    </form>
  );
}