import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function NewsDetail() {
  const { id } = useParams();
  const [news, setNews] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userReaction, setUserReaction] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const newsRef = doc(db, 'news', id);
        const newsDoc = await getDoc(newsRef);
        
        if (newsDoc.exists()) {
          const newsData = newsDoc.data();
          setNews({
            id: newsDoc.id,
            ...newsData,
            createdAt: newsData.createdAt?.toDate()
          });

          // IP bazlı görüntülenme sayısı
          const viewsRef = doc(collection(newsRef, 'stats'), 'views');
          const viewsDoc = await getDoc(viewsRef);
          
          if (!viewsDoc.exists()) {
            await updateDoc(viewsRef, { count: 1, ips: [window.clientIP] });
          } else if (!viewsDoc.data().ips.includes(window.clientIP)) {
            await updateDoc(viewsRef, {
              count: viewsDoc.data().count + 1,
              ips: [...viewsDoc.data().ips, window.clientIP]
            });
          }
        }
      } catch (error) {
        console.error('Haber detayı yüklenirken hata:', error);
        setError('Haber detayı yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const commentsRef = collection(db, 'news', id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [id]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!auth.currentUser || !newComment.trim()) return;

    try {
      const commentsRef = collection(db, 'news', id, 'comments');
      await addDoc(commentsRef, {
        content: newComment,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName,
        createdAt: new Date()
      });
      setNewComment('');
    } catch (error) {
      console.error('Yorum eklenirken hata:', error);
      alert('Yorum eklenirken bir hata oluştu.');
    }
  };

  const handleReaction = async (type) => {
    if (!auth.currentUser) return;

    try {
      const reactionRef = doc(db, 'news', id, 'reactions', auth.currentUser.uid);
      const reactionDoc = await getDoc(reactionRef);

      if (reactionDoc.exists()) {
        const currentReaction = reactionDoc.data().type;
        if (currentReaction === type) {
          // Reaksiyonu kaldır
          await updateDoc(reactionRef, { type: null });
          setUserReaction(null);
        } else {
          // Reaksiyonu değiştir
          await updateDoc(reactionRef, { type });
          setUserReaction(type);
        }
      } else {
        // Yeni reaksiyon ekle
        await setDoc(reactionRef, { type, userId: auth.currentUser.uid });
        setUserReaction(type);
      }
    } catch (error) {
      console.error('Reaksiyon eklenirken hata:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error || 'Haber bulunamadı.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-4">{news.title}</h1>
          
          <div className="flex items-center justify-between mb-6">
            <Link 
              to={`/profile/${news.userId}`}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600"
            >
              <span className="font-medium">{news.userName}</span>
            </Link>
            <span className="text-gray-500">
              {format(news.createdAt, 'dd MMMM yyyy HH:mm', { locale: tr })}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-6">
            {news.imageUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Haber görseli ${index + 1}`}
                className="w-full rounded-lg"
              />
            ))}
          </div>

          <p className="text-gray-700 mb-6 whitespace-pre-wrap">{news.description}</p>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleReaction('like')}
                className={`flex items-center space-x-1 ${
                  userReaction === 'like' ? 'text-blue-600' : 'text-gray-500'
                }`}
                disabled={!auth.currentUser}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                <span>{likes}</span>
              </button>
              
              <button
                onClick={() => handleReaction('dislike')}
                className={`flex items-center space-x-1 ${
                  userReaction === 'dislike' ? 'text-red-600' : 'text-gray-500'
                }`}
                disabled={!auth.currentUser}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5 6h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2.5" />
                </svg>
                <span>{dislikes}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t p-6">
          <h2 className="text-xl font-bold mb-4">Yorumlar</h2>
          
          {auth.currentUser ? (
            <form onSubmit={handleComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Yorumunuzu yazın..."
                rows="3"
                required
              />
              <button
                type="submit"
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Yorum Yap
              </button>
            </form>
          ) : (
            <p className="text-gray-500 mb-6">
              Yorum yapmak için lütfen{' '}
              <Link to="/login" className="text-blue-500 hover:text-blue-600">
                giriş yapın
              </Link>
            </p>
          )}

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border-b pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Link
                    to={`/profile/${comment.userId}`}
                    className="font-medium text-gray-700 hover:text-blue-600"
                  >
                    {comment.userName}
                  </Link>
                  <span className="text-sm text-gray-500">
                    {format(comment.createdAt, 'dd MMM yyyy HH:mm', { locale: tr })}
                  </span>
                </div>
                <p className="text-gray-600">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}