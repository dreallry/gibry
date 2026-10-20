const PUBLIC_FIELDS = ['nama', 'username', 'photoURL', 'bio', 'kelas', 'minatBaca', 'favoriteQuote',
  'displayBadge', 'avatarFrame', 'level', 'totalPoints', 'readingStreak', 'likesCount', 'kudosCount',
  'role', 'banned', 'status', 'createdAt'];

function publicProfile(profile) {
  if (!profile) return null;
  return Object.fromEntries(PUBLIC_FIELDS.filter(key => profile[key] !== undefined).map(key => [key, profile[key]]));
}
module.exports = { publicProfile };
