import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export default function ReportButton({ blogId, blogTitle }) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reasons = [
    'Uygunsuz İçerik',
    'Spam',
    'Nefret Söylemi',
    'Yanlış Bilgi',
    'Telif Hakkı İhlali',
    'Diğer'
  ];

  const handleReport = async (e) => {
    e.preventDefault();

    if (!auth.currentUser) {
      alert('Lütfen önce giriş yapın');
      return;
    }

    if (!reason) {
      setError('Lütfen bir şikayet sebebi seçin');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Kullanıcının daha önce bu blog için şikayet oluşturup oluşturmadığını kontrol et
      const reportsRef = collection(db, 'reports');
      const q = query(
        reportsRef,
        where('blogId', '==', blogId),
        where('reporterId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new Error('Bu içerik için daha önce şikayette bulundunuz');
      }

      // Yeni şikayet oluştur
      await addDoc(reportsRef, {
        blogId,
        blogTitle,
        reporterId: auth.currentUser.uid,
        reporterName: auth.currentUser.displayName,
        reason,
        description,
        status: 'new',
        createdAt: new Date()
      });

      alert('Şikayetiniz alınmıştır. En kısa sürede incelenecektir.');
      setShowModal(false);
      setReason('');
      setDescription('');
    } catch (err) {
      console.error('Şikayet gönderilirken hata:', err);
      setError(err.message || 'Şikayet gönderilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-red-600 hover:text-red-800 flex items-center space-x-1"
        title="Bu içeriği şikayet et"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
        </svg>
        <span className="text-sm">Şikayet Et</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">İçeriği Şikayet Et</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şikayet Sebebi
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seçiniz</option>
                  {reasons.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="4"
                  placeholder="Lütfen şikayetinizi detaylandırın..."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2 px-4 rounded-md ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } transition-colors`}
                >
                  {loading ? 'Gönderiliyor...' : 'Şikayet Et'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}