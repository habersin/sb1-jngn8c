import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ModeratorPanel() {
  const [pendingBlogs, setPendingBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moderationNote, setModerationNote] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const fetchPendingBlogs = async () => {
    try {
      console.log('Bekleyen gönderiler yükleniyor...');
      const blogsRef = collection(db, 'blogs');
      const q = query(
        blogsRef,
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      console.log(`${snapshot.docs.length} bekleyen gönderi bulundu`);
      
      const blogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      setPendingBlogs(blogs);
      setError(null);
    } catch (error) {
      console.error('Bekleyen gönderiler yüklenirken hata:', error);
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 2000);
      } else {
        setError('Bekleyen gönderiler yüklenirken bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkModeratorStatus = async () => {
      if (!auth.currentUser) {
        setError('Lütfen giriş yapın.');
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists() || !userDoc.data().isModerator) {
          setError('Bu sayfaya erişim yetkiniz yok.');
          setLoading(false);
          return;
        }

        fetchPendingBlogs();
      } catch (error) {
        console.error('Moderatör kontrolü sırasında hata:', error);
        setError('Bir hata oluştu. Lütfen sayfayı yenileyin.');
        setLoading(false);
      }
    };

    checkModeratorStatus();
  }, [retryCount]);

  const handleModeration = async (blogId, decision) => {
    try {
      const blogRef = doc(db, 'blogs', blogId);
      const blogDoc = await getDoc(blogRef);
      
      if (!blogDoc.exists()) {
        throw new Error('Blog bulunamadı');
      }

      const blogData = blogDoc.data();
      
      await updateDoc(blogRef, {
        status: decision,
        moderationNote: moderationNote || 
          (decision === 'approved' ? 'İçerik onaylandı.' : 'İçerik reddedildi.'),
        moderatedBy: auth.currentUser.uid,
        moderatedAt: new Date()
      });

      // Bildirim oluştur
      const notificationRef = collection(db, 'notifications');
      await addDoc(notificationRef, {
        userId: blogData.userId,
        type: 'moderation',
        message: decision === 'approved' 
          ? 'Paylaşımınız onaylandı ve yayınlandı!'
          : `Paylaşımınız reddedildi. Sebep: ${moderationNote || 'İçerik politikalarına uygun değil.'}`,
        blogId,
        createdAt: new Date(),
        read: false
      });

      setPendingBlogs(pendingBlogs.filter(blog => blog.id !== blogId));
      setModerationNote('');
      
      alert(decision === 'approved' ? 'İçerik onaylandı!' : 'İçerik reddedildi!');
    } catch (error) {
      console.error('Moderasyon işlemi sırasında hata:', error);
      alert('İşlem sırasında bir hata oluştu.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
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
            onClick={() => setRetryCount(0)}
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
      <h1 className="text-2xl font-bold mb-6">Moderatör Paneli</h1>
      
      {pendingBlogs.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Bekleyen içerik bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingBlogs.map(blog => (
            <div key={blog.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{blog.title}</h2>
                  <p className="text-sm text-gray-500">
                    Yazar: {blog.authorName} | Kategori: {blog.category}
                  </p>
                  <p className="text-sm text-gray-500">
                    Gönderim: {format(blog.createdAt, 'dd MMMM yyyy HH:mm', { locale: tr })}
                  </p>
                </div>
              </div>

              {blog.imageUrl && (
                <img
                  src={blog.imageUrl}
                  alt={blog.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}

              <p className="text-gray-700 mb-4">{blog.content}</p>

              <div className="space-y-4">
                <textarea
                  placeholder="Moderasyon notu (Opsiyonel)"
                  className="w-full p-2 border rounded-md"
                  value={moderationNote}
                  onChange={(e) => setModerationNote(e.target.value)}
                />

                <div className="flex space-x-4">
                  <button
                    onClick={() => handleModeration(blog.id, 'approved')}
                    className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => handleModeration(blog.id, 'rejected')}
                    className="flex-1 py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}