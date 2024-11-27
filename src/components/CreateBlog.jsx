import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { containsProfanity, validateImage } from '../utils/contentFilter';

const IMGUR_CLIENT_ID = 'ffd674a20801d6b';

export default function CreateBlog({ onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const categories = [
    'Sosyal', 'Siyasal', 'Ekonomi', 'Finans', 'İş', 'İşçi', 'Magazin',
    'Polis', 'Adliye', 'Spor', 'Bilim', 'Din', 'Eğitim', 'Sağlık',
    'Ev', 'Yaşam', 'Çevre', 'Hukuk', 'Çöp', 'Sorun', 'Buluntu Eşya',
    'Su', 'Elektrik', 'İnternet'
  ];

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    if (files.length > 3) {
      setError('En fazla 3 görsel seçebilirsiniz');
      e.target.value = '';
      return;
    }

    try {
      setAnalyzing(true);
      setError('');

      // Her görseli doğrula
      for (const file of files) {
        await validateImage(file);
      }

      setImages(files);

      // Önizlemeleri oluştur
      const previews = await Promise.all(
        files.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        })
      );
      
      setImagePreviews(previews);
    } catch (err) {
      setError(err.message);
      e.target.value = '';
      setImages([]);
      setImagePreviews([]);
    } finally {
      setAnalyzing(false);
    }
  };

  const uploadToImgur = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          Authorization: `Client-ID ${IMGUR_CLIENT_ID}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Görsel yükleme başarısız');
      }

      const data = await response.json();
      return data.data.link;
    } catch (error) {
      console.error('Görsel yükleme hatası:', error);
      throw new Error('Görsel yüklenirken bir hata oluştu.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      setError('Lütfen önce giriş yapın');
      return;
    }

    if (!consentChecked) {
      setError('Lütfen paylaşım koşullarını onaylayın');
      return;
    }

    if (images.length === 0) {
      setError('En az 1 görsel seçmelisiniz');
      return;
    }

    if (images.length > 3) {
      setError('En fazla 3 görsel seçebilirsiniz');
      return;
    }

    if (containsProfanity(title)) {
      setError('Başlıkta uygunsuz ifadeler tespit edildi. Lütfen düzenleyin.');
      return;
    }

    if (containsProfanity(content)) {
      setError('İçerikte uygunsuz ifadeler tespit edildi. Lütfen düzenleyin.');
      return;
    }

    if (title.length < 5) {
      setError('Başlık en az 5 karakter olmalıdır.');
      return;
    }

    if (content.length < 20) {
      setError('İçerik en az 20 karakter olmalıdır.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Tüm görselleri yükle
      const imageUrls = await Promise.all(images.map(uploadToImgur));

      const formattedTitle = title.toUpperCase();

      const searchableContent = [
        ...formattedTitle.toLowerCase().split(' '),
        ...content.toLowerCase().split(' '),
        category.toLowerCase()
      ].filter(word => word.length > 2);

      const blogData = {
        title: formattedTitle,
        content,
        category,
        imageUrl: imageUrls[0], // İlk görsel ana görsel olarak kullanılır
        additionalImages: imageUrls.slice(1), // Diğer görseller
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        authorName: isAnonymous ? 'Anonim' : (auth.currentUser.displayName || 'İsimsiz Yazar'),
        likes: 0,
        views: 0,
        dislikes: 0,
        searchableContent,
        status: 'active',
        consentAccepted: true,
        isAnonymous
      };

      await addDoc(collection(db, 'blogs'), blogData);

      setTitle('');
      setContent('');
      setCategory('');
      setImages([]);
      setImagePreviews([]);
      setConsentChecked(false);
      setIsAnonymous(false);

      alert('Haber başarıyla paylaşıldı!');
      onClose();
      window.location.reload();
    } catch (err) {
      console.error('Haber paylaşma hatası:', err);
      setError(err.message || 'Haber paylaşılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
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
          className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 uppercase"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ textTransform: 'uppercase' }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Kategori</label>
        <select
          required
          className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Kategori Seçin</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Görseller (1-3 arası)</label>
        <div className="mt-1 flex items-center">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={handleImageChange}
            multiple
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={analyzing}
          />
        </div>
        {analyzing && (
          <p className="mt-2 text-sm text-blue-600">
            Görseller analiz ediliyor...
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Maksimum dosya boyutu: 10MB. PNG, JPG ve GIF formatları desteklenir.
          İlk seçilen görsel ana görsel olarak kullanılacaktır.
        </p>
        {imagePreviews.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`Önizleme ${index + 1}`}
                  className="h-24 w-full object-cover rounded-lg"
                />
                {index === 0 && (
                  <span className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-tl-lg">
                    Ana Görsel
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const newImages = [...images];
                    const newPreviews = [...imagePreviews];
                    newImages.splice(index, 1);
                    newPreviews.splice(index, 1);
                    setImages(newImages);
                    setImagePreviews(newPreviews);
                  }}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">İçerik</label>
        <textarea
          required
          className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
          rows="10"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-start space-x-2">
          <input
            type="checkbox"
            id="consent"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="consent" className="text-sm text-gray-600">
            Paylaşılan haberlerin Sinop Belediyesi ve Sinop Emniyet Genel Müdürlüğü tarafından takip edildiğini okudum, onaylıyorum.
          </label>
        </div>

        <div className="flex items-start space-x-2">
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="anonymous" className="text-sm text-gray-600">
            Anonim olarak paylaş
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || analyzing || !consentChecked}
        className={`w-full py-2 px-4 rounded-md ${
          loading || analyzing || !consentChecked
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } transition-colors duration-200`}
      >
        {loading ? 'Paylaşılıyor...' : analyzing ? 'Görseller Analiz Ediliyor...' : 'Haberi Paylaş'}
      </button>
    </form>
  );
}