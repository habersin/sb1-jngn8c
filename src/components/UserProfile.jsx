import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function UserProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserAndBlogs = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Kullanıcı ve blog verilerini paralel olarak çek
        const [userDoc, blogsSnapshot] = await Promise.all([
          getDoc(doc(db, 'users', userId)),
          getDocs(
            query(
              collection(db, 'blogs'),
              where('userId', '==', userId),
              orderBy('createdAt', 'desc')
            )
          )
        ]);

        // Kullanıcı verilerini ayarla
        if (userDoc.exists()) {
          setUser({
            id: userDoc.id,
            ...userDoc.data()
          });
        } else {
          // Kullanıcı bulunamadıysa varsayılan değerler kullan
          setUser({
            id: userId,
            firstName: 'İsimsiz',
            lastName: 'Kullanıcı',
            photoURL: null
          });
        }

        // Blog verilerini ayarla
        const blogsData = blogsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        
        setBlogs(blogsData);
      } catch (err) {
        console.error('Kullanıcı profili yüklenirken hata:', err);
        setError('Kullanıcı profili yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndBlogs();
  }, [userId]);

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
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-4">
          <img
            src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=random`}
            alt={`${user?.firstName} ${user?.lastName}`}
            className="w-20 h-20 rounded-full object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">{`${user?.firstName} ${user?.lastName}`}</h1>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Paylaşılan Haberler</h2>
        {blogs.length > 0 ? (
          blogs.map(blog => (
            <article key={blog.id} className="bg-white rounded-lg shadow-md p-6">
              {blog.imageUrl && (
                <img
                  src={blog.imageUrl}
                  alt={blog.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <Link to={`/blog/${blog.id}`}>
                <h3 className="text-xl font-bold hover:text-blue-600 transition-colors">
                  {blog.title}
                </h3>
              </Link>
              <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                <span>{blog.category}</span>
                <time>{format(blog.createdAt, 'dd MMMM yyyy', { locale: tr })}</time>
              </div>
              <p className="mt-2 text-gray-600 line-clamp-2">{blog.content}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span>{blog.views || 0} görüntülenme</span>
                  <span>{blog.likes || 0} beğeni</span>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="text-center text-gray-500 py-4">
            Henüz haber paylaşılmamış.
          </p>
        )}
      </div>
    </div>
  );
}