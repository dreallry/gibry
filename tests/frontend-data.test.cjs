const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies) {
  const context = { exports: {}, require: name => dependencies[name] || new Proxy({}, { get: () => () => null }), console: { error() {} }, setTimeout, clearTimeout, URLSearchParams };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, context);
  return context.exports;
}

function reactHarness() {
  const callbacks = [], effects = [], state = [];
  return {
    callbacks, effects, state,
    react: {
      useState(initial) { const index = state.length; state.push(initial); return [initial, value => { state[index] = value; }]; },
      useRef: initial => ({ current: initial }),
      useCallback(callback) { callbacks.push(callback); return callback; },
      useEffect(effect) { effects.push(effect); },
    },
  };
}

test('presence registers disconnect handling before publishing online and restores it on reconnect', async () => {
  const operations = [];
  let callback, released = false;
  const library = load('src/lib/profiles.ts', {
    './firebase': { db: {} },
    'firebase/database': {
      ref: (_db, path) => path,
      onValue(_path, listener) { callback = listener; return () => { released = true; }; },
      onDisconnect() { return { async set() { operations.push('disconnect'); } }; },
      async update(_path, data) { operations.push(data.online ? 'online' : 'offline'); },
      serverTimestamp: () => 1,
    },
  });
  const off = library.setUserOnlineStatus('alice');
  callback({ val: () => true }); await new Promise(setImmediate);
  callback({ val: () => false }); callback({ val: () => true }); await new Promise(setImmediate);
  assert.deepEqual(operations, ['disconnect', 'online', 'disconnect', 'online']);
  off(); assert.equal(released, true); assert.equal(operations.at(-1), 'offline');
});

test('login attaches online presence only to verified active members', async () => {
  const harness = reactHarness();
  let callback, online = 0;
  let profile = { uid: 'alice', banned: false, status: 'active' };
  const library = load('src/contexts/AuthContext.tsx', {
    react: { ...harness.react, createContext: () => ({ Provider: {} }) },
    'firebase/auth': { onAuthStateChanged(_auth, handler) { callback = handler; return () => {}; } },
    '@/lib/firebase': { auth: {} },
    '@/lib/api': { postApi: async () => ({}) },
    '@/lib/firestore': { getUserProfile: async () => profile, setUserOnlineStatus() { online++; return () => {}; }, onUserProfileChanged: () => () => {} },
  });
  library.AuthProvider({ children: null });
  const cleanup = harness.effects[0]();
  await callback({ uid: 'alice', emailVerified: false }); assert.equal(online, 0);
  await callback({ uid: 'alice', emailVerified: true }); assert.equal(online, 1);
  profile = { ...profile, banned: true };
  await callback({ uid: 'alice', emailVerified: true }); assert.equal(online, 1);
  cleanup();
});

function cataloguePage(user) {
  const harness = reactHarness();
  const requests = [], errors = [];
  const books = [{ id: 'one', judul: 'One' }];
  const page = load('src/pages/BooksPage.tsx', {
    react: harness.react,
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
    'react-router-dom': { useSearchParams: () => [new URLSearchParams(), () => {}] },
    '@/contexts/AuthContext': { useAuth: () => ({ user }) },
    '@/components/Toast': { useToast: () => ({ toast() {} }) },
    '@/lib/firestore': { getBooks: async () => books, getDistinctYears: async () => [2026], getUserFavorites: async () => [], getSmartRecommendations: async () => ({ personalized: [] }) },
    'firebase/database': {
      ref: (_db, path) => path,
      async get(path) {
        requests.push(path);
        if (!user) { errors.push(path); throw new Error('Permission denied'); }
        return { exists: () => true, val: () => path === 'book_reservations' ? { waiting: { bookId: 'one', status: 'waiting' }, ready: { bookId: 'one', status: 'ready' } } : {} };
      },
    },
    '@/lib/firebase': { db: {} },
  });
  page.default();
  return { ...harness, requests, errors, books };
}

test('anonymous catalogue never requests private reservation or wishlist data', async () => {
  const page = cataloguePage(null);
  await page.callbacks[1]();
  assert.deepEqual(page.requests, []);
  assert.deepEqual(page.errors, []);
  assert.equal(page.state[0], page.books);
});

test('signed-in catalogue retains waiting reservation counts and wishlist reads', async () => {
  const page = cataloguePage({ uid: 'alice' });
  await page.callbacks[1]();
  assert.deepEqual(page.requests, ['book_reservations', 'wishlists']);
  assert.equal(page.state[6].one, 1);
});

test('digital availability becomes available after its deadline without a scheduled update', async () => {
  const records = { public_books: { digital: { id: 'digital', status: 'Dipinjam' } }, book_status: { digital: { status: 'Dipinjam', availableAfter: 1 }, physical: { status: 'Dipinjam' } }, 'book_status/digital': { status: 'Dipinjam', availableAfter: 1 } };
  const library = load('src/lib/catalog.ts', {
    './firebase': { db: {}, auth: { currentUser: null } },
    'firebase/database': { ref: (_db, path) => path, get: async path => ({ exists: () => Boolean(records[path]), val: () => records[path] }) },
    './database': { snapshotToArray: snapshot => Object.values(snapshot.val() || {}) },
  });
  assert.equal(await library.getBookStatus('digital'), 'Tersedia');
  const statuses = await library.getBookStatuses();
  assert.equal(statuses.digital, 'Tersedia'); assert.equal(statuses.physical, 'Dipinjam');
  assert.equal((await library.getBookStats()).available, 1);
});

test('club membership counts are derived from unique users and update on membership changes', async () => {
  const members = { first: { clubId: 'club', userId: 'alice' }, duplicate: { clubId: 'club', userId: 'alice' }, second: { clubId: 'club', userId: 'bob' } };
  const callbacks = {}, released = [], results = [];
  const data = { book_clubs: { club: { memberCount: 999, name: 'Club' } }, club_members: members };
  const library = load('src/lib/clubs.ts', {
    'firebase/database': { ref: (_db, path) => path, get: async path => ({ val: () => data[path] }), onValue(path, callback) { callbacks[path] = callback; return () => released.push(path); } },
  });
  assert.equal((await library.getBookClubs())[0].memberCount, 2);
  const off = library.onBookClubsChanged(clubs => results.push(clubs));
  callbacks.book_clubs({ val: () => data.book_clubs }); assert.equal(results.length, 0);
  callbacks.club_members({ val: () => members }); assert.equal(results.at(-1)[0].memberCount, 2);
  callbacks.club_members({ val: () => ({ first: members.first }) }); assert.equal(results.at(-1)[0].memberCount, 1);
  off(); assert.deepEqual(released, ['book_clubs', 'club_members']);
});

test('counting many clubs reads each membership once', async () => {
  let reads = 0;
  const clubData = Object.fromEntries(Array.from({ length: 60 }, (_, index) => [`club${index}`, { name: `Club ${index}` }]));
  const memberships = Object.fromEntries(Array.from({ length: 1200 }, (_, index) => [String(index), {
    get clubId() { reads++; return `club${index % 60}`; }, userId: `user${index}`,
  }]));
  const data = { book_clubs: clubData, club_members: memberships };
  const library = load('src/lib/clubs.ts', { 'firebase/database': { ref: (_db, path) => path, get: async path => ({ val: () => data[path] }) } });
  const result = await library.getBookClubs();
  assert.equal(result.length, 60);
  assert.ok(result.every(club => club.memberCount === 20));
  assert.ok(reads <= 2400, `Memberships were inspected ${reads} times`);
});

test('club detail requests only the selected club and loads a duplicate member profile once', async () => {
  const requests = [], profiles = [];
  const library = load('src/lib/clubs.ts', {
    'firebase/database': {
      ref: (_db, path) => ({ path }), orderByChild: field => ({ field }), equalTo: value => ({ value }),
      query: (reference, ...constraints) => ({ ...reference, constraints }),
      async get(request) {
        requests.push(request);
        if (request.path === 'book_clubs/club') return { exists: () => true, val: () => ({ createdBy: 'alice' }) };
        assert.equal(request.constraints?.[0]?.field, 'clubId');
        assert.equal(request.constraints?.[1]?.value, 'club');
        const data = request.path === 'club_members' ? { one: { clubId: 'club', userId: 'alice', role: 'admin' }, duplicate: { clubId: 'club', userId: 'alice', role: 'admin' } } : { message: { clubId: 'club', userId: 'alice', text: 'Hi' } };
        return { exists: () => true, val: () => data };
      },
    },
    './profiles': { async getUserProfile(uid) { profiles.push(uid); return { nama: uid }; } },
  });
  assert.equal((await library.getClubMessages('club')).length, 1);
  assert.equal(await library.isUserClubMember('club', 'alice'), true);
  assert.equal(await library.getClubMemberRole('club', 'alice'), 'admin');
  assert.equal((await library.getClubMemberDetails('club')).length, 1);
  assert.deepEqual(profiles, ['alice']);
  assert.equal(requests.length, 5);
});

test('community reply counts are derived without a Cloud Functions counter', async () => {
  const data = { komunitas_post: { post: { content: 'Post', repliesCount: 999, createdAt: 1 } }, komunitas_balasan: { post: { one: {}, two: {} } } };
  const library = load('src/lib/community.ts', { 'firebase/database': { ref: (_db, path) => path, get: async path => ({ exists: () => true, val: () => data[path] }) } });
  assert.equal((await library.getCommunityPosts())[0].repliesCount, 2);
});

test('public reading lists request only the public subset from Firebase', async () => {
  const requests = [];
  const library = load('src/lib/collections.ts', {
    'firebase/database': {
      ref: (_db, path) => ({ path }),
      orderByChild: field => ({ field }),
      equalTo: value => ({ value }),
      query: (reference, ...constraints) => ({ ...reference, constraints }),
      async get(request) {
        requests.push(request);
        assert.equal(request.path, 'reading_lists');
        assert.equal(request.constraints?.[0]?.field, 'isPublic');
        assert.equal(request.constraints?.[1]?.value, true);
        return { exists: () => true, val: () => ({ old: { isPublic: true, title: 'Old', createdAt: 1 }, newer: { isPublic: true, title: 'New', createdAt: 2 } }) };
      },
    },
    './firebase': { db: {} },
  });
  const lists = await library.getPublicReadingLists();
  assert.equal(requests.length, 1);
  assert.equal(lists[0].title, 'New');
});

test('a missing reading list returns null without reading books', async () => {
  const requests = [];
  const library = load('src/lib/collections.ts', {
    'firebase/database': { ref: (_db, path) => path, get: async path => { requests.push(path); return { exists: () => false, val: () => null }; } },
    './firebase': { db: {} },
  });
  assert.equal(await library.getReadingListWithBooks('missing'), null);
  assert.deepEqual(requests, ['reading_lists/missing']);
});

function adminData(activeTab, failingService) {
  const harness = reactHarness();
  const calls = [];
  const services = Object.fromEntries(['getAllUsers', 'getBooks', 'getAllBorrows', 'getAnnouncements', 'getPublicReadingLists', 'getAllEvents', 'getAllRewards', 'getAllRedemptions', 'getPresensiConfig', 'getContentReports', 'getInvitationCodes', 'getBookSuggestions'].map(name => [name, async () => {
    calls.push(name);
    if (name === failingService) throw new Error('Permission denied');
    return name === 'getPresensiConfig' ? { token: 'test' } : [];
  }]));
  const { useAdminData } = load('src/hooks/admin/useAdminData.ts', { react: harness.react, '@/lib/firestore': services });
  const controller = useAdminData({ activeTab });
  return { ...harness, controller, calls };
}

test('visible Admin tabs load their grouped data on entry and refresh after actions', async () => {
  const cases = {
    programs: ['getAnnouncements', 'getPublicReadingLists', 'getAllEvents', 'getAllRewards', 'getAllRedemptions', 'getContentReports', 'getBookSuggestions'],
    users: ['getInvitationCodes'],
    circulation: ['getPresensiConfig'],
    events: ['getAllEvents'],
  };
  for (const [tab, expected] of Object.entries(cases)) {
    const data = adminData(tab);
    for (const effect of data.effects) effect();
    await new Promise(setImmediate);
    for (const service of expected) assert.ok(data.calls.includes(service), `${tab} does not load ${service}`);
    data.calls.length = 0;
    await data.controller.loadData();
    for (const service of expected) assert.ok(data.calls.includes(service), `${tab} does not refresh ${service}`);
  }
});

test('an Admin section failure does not prevent other grouped sections from loading', async () => {
  const data = adminData('programs', 'getAnnouncements');
  await data.controller.loadData();
  assert.ok(data.calls.includes('getAllEvents'));
  assert.ok(data.calls.includes('getBookSuggestions'));
});
