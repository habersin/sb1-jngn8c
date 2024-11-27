import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  limit,
  startAfter,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import EditBlog from './EditBlog';

export default function BlogList({ searchQuery }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBlog, setEditingBlog] = useState(null);
  const navigate = useNavigate();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [lastVisible, setLastVisible] = useState(null);
  const BLOGS_PER_PAGE = 20;

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ana sorgu
        const blogsRef = collection(db, 'blogs');
        let q = query(
          blogsRef,
          orderBy('createdAt', 'desc'),
          limit(BLOGS_PER_PAGE)
        );

        // Toplam blog sayısını al
        const totalSnapshot = await getDocs(collection(db, 'blogs'));
        const totalBlogs = totalSnapshot.size;
        setTotalPages(Math.ceil(totalBlogs / BLOGS_PER_PAGE));

        // Eğer sayfa 1'den büyükse, son görünen öğeden sonrasını al
        if (currentPage > 1 && lastVisible) {
          q = query(
            blogsRef,
            orderBy('createdAt', 'desc'),
            startAfter(lastVisible),
            limit(BLOGS_PER_PAGE)
          );
        }

        const snapshot = await getDocs(q);

        // Son görünen öğeyi kaydet
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

        let blogsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        }));

        // Arama filtresi
        if (searchQuery) {
          const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
          blogsData = blogsData.filter((blog) => {
            const searchableContent = [
              blog.title,
              blog.content,
              blog.category,
              blog.authorName,
            ]
              .join(' ')
              .toLowerCase();

            return searchTerms.every((term) =>
              searchableContent.includes(term)
            );
          });
        }

        setBlogs(blogsData);
      } catch (error) {
        console.error('Blog yazıları yüklenirken hata:', error);
        setError('Blog yazıları yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [searchQuery, currentPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0); // Sayfa başına scroll
  };

  const handleDelete = async (blogId) => {
    if (!window.confirm('Bu haberi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'blogs', blogId));
      setBlogs((prevBlogs) => prevBlogs.filter((blog) => blog.id !== blogId));
      alert('Haber başarıyla silindi.');
    } catch (error) {
      console.error('Haber silinirken hata:', error);
      alert('Haber silinirken bir hata oluştu. Lütfen tekrar deneyin.');
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
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  if (blogs.length === 0) {
    return (
      <div className="text-center py-5">
        <h2 className="text-2xl font-bold text-gray-700 mb-40">
          {searchQuery
            ? 'Arama sonucu bulunamadı'
            : 'Henüz haber paylaşılmamış'}
        </h2>
        <p className="text-gray-500">
          {searchQuery
            ? 'Farklı anahtar kelimelerle tekrar deneyin'
            : 'İlk haberi sen paylaş!'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 max-w-4xl mx-auto">
        {blogs.map((blog) => (
          <article
            key={blog.id}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-blue-600 font-medium">
                  {blog.category}
                </span>
                <div className="flex items-center space-x-2">
                  <time className="text-sm text-gray-500">
                    {format(blog.createdAt, 'dd MMMM yyyy', { locale: tr })}
                  </time>
                  {auth.currentUser?.uid === blog.userId && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingBlog(blog)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(blog.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Sil"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {blog.imageUrl && (
                <Link to={`/blog/${blog.id}`} className="block cursor-pointer">
                  <img
                    src={blog.imageUrl}
                    alt={blog.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                </Link>
              )}

              <Link to={`/blog/${blog.id}`}>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors uppercase">
                  {blog.title}
                </h2>
                <p className="text-gray-600 line-clamp-3">{blog.content}</p>
              </Link>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm">
                    Yazar:{' '}
                    <Link
                      to={`/user/${blog.userId}`}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {blog.authorName}
                    </Link>
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {blog.likes || 0} beğeni
                  </span>
                  <span className="text-sm text-gray-500">
                    {blog.dislikes || 0} beğenmeme
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8 mb-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-md ${
              currentPage === 1
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Önceki
          </button>

          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              onClick={() => handlePageChange(index + 1)}
              className={`px-4 py-2 rounded-md ${
                currentPage === index + 1
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {index + 1}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-md ${
              currentPage === totalPages
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Sonraki
          </button>
        </div>
      )}

      {editingBlog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Haberi Düzenle</h2>
              <button
                onClick={() => setEditingBlog(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <EditBlog
              blog={editingBlog}
              onClose={() => {
                setEditingBlog(null);
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
