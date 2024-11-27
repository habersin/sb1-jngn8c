import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function UserNews({ userId }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserNews = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const newsRef = collection(db, 'news');
        const q = query(newsRef, where('userId', '==', userId));
        
        const snapshot = await getDocs(q);
        const newsData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          }))
          .sort((a, b) => b.createdAt - a.createdAt);
        
        setNews(newsData);
      } catch (error) {
        console.error('Haberler yüklenirken hata:', error);
        setError('Haberleriniz yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserNews();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-4 text-gray-600">
        Henüz haber paylaşılmamış.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {news.map((item) => (
        <div key={item.id} className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {item.imageUrls?.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Haber görseli ${index + 1}`}
                className="w-full h-32 object-cover rounded"
              />
            ))}
          </div>
          <h3 className="text-xl font-bold mb-2">{item.title}</h3>
          <p className="text-gray-700 mb-4">{item.description}</p>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>📍 {item.location}</span>
            <span>
              {format(item.createdAt, 'dd MMMM yyyy HH:mm', { locale: tr })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}