const FIELDS = ['judul', 'penulis', 'penerbit', 'tahun', 'halaman', 'isbn', 'deskripsi', 'cover',
  'status', 'type', 'genre', 'lokasiRak', 'createdAt', 'updatedAt'];
function publicBook(book) {
  if (!book) return null;
  return Object.fromEntries(FIELDS.filter(key => book[key] !== undefined).map(key => [key, book[key]]));
}
module.exports = { publicBook };
