import React, { useState } from 'react';
import { db, storage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export default function EditBlog({ blog, onClose }) {
  const [title, setTitle] = useState(blog.title);
  const [content, setContent] = useState(blog.content);
  const [category, setCategory] = useState(blog.category);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(blog.imageUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'Sosyal', 'Siyasal', 'Ekonomi', 'Finans', 'İş', 'İşçi', 'Magazin',
    'Polis', 'Adliye', 'Spor', 'Bilim', 'Din', 'Eğitim', 'Sağlık',
    'Ev', 'Yaşam', 'Çevre', 'Hukuk', 'Çöp', 'Sorun', 'Buluntu Eşya',
    'Su', 'Elektrik', 'İnternet'
  ];

  const validateImage = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Sadece JPG, PNG ve GIF formatları desteklenir.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Görsel boyutu 5MB\'dan küçük olmalıdır.');
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      validateImage(file);
      setImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setError('');
    } catch (err) {
      setError(err.message);
      e.target.value = '';
      setImage(null);
      setImagePreview(blog.imageUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      let imageUrl = blog.imageUrl;

      if (image) {
        // Eski görseli sil
        if (blog.imageUrl) {
          const oldImageRef = ref(storage, blog.imageUrl);
          await deleteObject(oldImageRef);
        }

        // Yeni görseli yükle
        const fileName = `${Date.now()}-${image.name}`;
        const storageRef = ref(storage, `blog_images/${fileName}`);
        const snapshot = await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      // Blog yazısını güncelle
      const blogRef = doc(db, 'blogs', blog.id);
      await updateDoc(blogRef, {
        title,
        content,
        category,
        imageUrl,
        updatedAt: new Date()
      });

      alert('Blog yazısı başarıyla güncellendi!');
      onClose();
    } catch (err) {
      console.error('Blog güncelleme hatası:', err);
      setError(err.message || 'Blog yazısı güncellenirken bir hata oluştu.');
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
          className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Görsel</label>
        <div className="mt-1 flex items-center">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        {imagePreview && (
          <div className="mt-2 relative">
            <img
              src={imagePreview}
              alt="Önizleme"
              className="max-h-48 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setImage(null);
                setImagePreview(blog.imageUrl);
              }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
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

      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={loading}
          className={`flex-1 py-2 px-4 rounded-md ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } transition-colors duration-200`}
        >
          {loading ? 'Güncelleniyor...' : 'Güncelle'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200"
        >
          İptal
        </button>
      </div>
    </form>
  );
}