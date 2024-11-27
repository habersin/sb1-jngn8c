import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import ReportButton from './ReportButton';

export default function BlogDetail({ setShowAuth }) {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userReaction, setUserReaction] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const blogRef = doc(db, 'blogs', id);
        const blogDoc = await getDoc(blogRef);
        
        if (blogDoc.exists()) {
          const blogData = blogDoc.data();
          setBlog({
            id: blogDoc.id,
            ...blogData,
            createdAt: blogData.createdAt?.toDate(),
            images: [blogData.imageUrl, ...(blogData.additionalImages || [])]
          });

          if (auth.currentUser) {
            const reactionRef = doc(db, 'blogs', id, 'reactions', auth.currentUser.uid);
            const reactionDoc = await getDoc(reactionRef);
            if (reactionDoc.exists()) {
              setUserReaction(reactionDoc.data().type);
            }
          }
        } else {
          setError('Blog yazısı bulunamadı.');
        }
      } catch (error) {
        console.error('Blog detayı yüklenirken hata:', error);
        setError('Blog detayı yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBlog();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const commentsRef = collection(db, 'blogs', id, 'comments');
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
    if (!auth.currentUser) {
      setShowAuth(true);
      return;
    }
    
    if (!newComment.trim()) return;

    try {
      const commentsRef = collection(db, 'blogs', id, 'comments');
      await addDoc(commentsRef, {
        content: newComment,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'İsimsiz Kullanıcı',
        createdAt: new Date()
      });
      setNewComment('');
    } catch (error) {
      console.error('Yorum eklenirken hata:', error);
      alert('Yorum eklenirken bir hata oluştu.');
    }
  };

  const handleReaction = async (type) => {
    if (!auth.currentUser) {
      setShowAuth(true);
      return;
    }

    try {
      const blogRef = doc(db, 'blogs', id);
      const reactionRef = doc(db, 'blogs', id, 'reactions', auth.currentUser.uid);
      const reactionDoc = await getDoc(reactionRef);

      if (reactionDoc.exists()) {
        const currentReaction = reactionDoc.data().type;
        if (currentReaction === type) {
          await deleteDoc(reactionRef);
          await updateDoc(blogRef, {
            [currentReaction + 's']: (blog[currentReaction + 's'] || 0) - 1
          });
          setUserReaction(null);
          setBlog(prev => ({
            ...prev,
            [currentReaction + 's']: (prev[currentReaction + 's'] || 0) - 1
          }));
        } else {
          await setDoc(reactionRef, { type });
          await updateDoc(blogRef, {
            [currentReaction + 's']: (blog[currentReaction + 's'] || 0) - 1,
            [type + 's']: (blog[type + 's'] || 0) + 1
          });
          setUserReaction(type);
          setBlog(prev => ({
            ...prev,
            [currentReaction + 's']: (prev[currentReaction + 's'] || 0) - 1,
            [type + 's']: (prev[type + 's'] || 0) + 1
          }));
        }
      } else {
        await setDoc(reactionRef, { type });
        await updateDoc(blogRef, {
          [type + 's']: (blog[type + 's'] || 0) + 1
        });
        setUserReaction(type);
        setBlog(prev => ({
          ...prev,
          [type + 's']: (prev[type + 's'] || 0) + 1
        }));
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

  if (error || !blog) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error || 'Blog yazısı bulunamadı.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-4">{blog.title}</h1>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Link to={`/user/${blog.userId}`} className="text-gray-600 hover:text-blue-600">
                {blog.authorName}
              </Link>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{blog.category}</span>
            </div>
            <div className="flex items-center space-x-4">
              <time className="text-gray-500">
                {format(blog.createdAt, 'dd MMMM yyyy', { locale: tr })}
              </time>
              <ReportButton blogId={blog.id} blogTitle={blog.title} />
            </div>
          </div>

          {blog.images && blog.images.length > 0 && (
            <div className="relative mb-6">
              <img
                src={blog.images[currentImageIndex]}
                alt={blog.title}
                className="w-full rounded-lg object-cover max-h-96"
              />
              {blog.images.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                  {blog.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-3 h-3 rounded-full ${
                        currentImageIndex === index ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-gray-700 mb-6 whitespace-pre-wrap">{blog.content}</p>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleReaction('like')}
                className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
                  userReaction === 'like'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title={auth.currentUser ? 'Beğen' : 'Beğenmek için giriş yapın'}
              >
                <FiThumbsUp className="w-5 h-5" />
                <span>{blog.likes || 0}</span>
              </button>
              
              <button
                onClick={() => handleReaction('dislike')}
                className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
                  userReaction === 'dislike'
                    ? 'bg-red-100 text-red-600'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title={auth.currentUser ? 'Beğenme' : 'Beğenmemek için giriş yapın'}
              >
                <FiThumbsDown className="w-5 h-5" />
                <span>{blog.dislikes || 0}</span>
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
                className="w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Yorumunuzu yazın..."
                rows="3"
                required
              />
              <button
                type="submit"
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Yorum Yap
              </button>
            </form>
          ) : (
            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <p className="text-gray-600">
                Yorum yapmak için lütfen{' '}
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  giriş yapın
                </button>
              </p>
            </div>
          )}

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border-b pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Link
                    to={`/user/${comment.userId}`}
                    className="font-medium text-gray-700 hover:text-blue-600"
                  >
                    {comment.userName}
                  </Link>
                  <time className="text-sm text-gray-500">
                    {format(comment.createdAt, 'dd MMM yyyy HH:mm', { locale: tr })}
                  </time>
                </div>
                <p className="text-gray-600">{comment.content}</p>
              </div>
            ))}

            {comments.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                Henüz yorum yapılmamış. İlk yorumu siz yapın!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}