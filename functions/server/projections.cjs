const { publicProfile } = require('./public-profiles.cjs');
const { withMemberAction } = require('./member-actions.cjs');

async function publishProfile(db, uid) {
  const profile = (await db.ref(`anggota/${uid}`).get()).val();
  const incoming = publicProfile(profile);
  await db.ref(`public_profiles/${uid}`).transaction(current => {
    if (!incoming) return null;
    const revision = profile.profileRevision || 0;
    const walletRevision = profile.walletRevision || 0;
    const result = (current?.profileRevision || 0) > revision ? { ...current } : { ...incoming, profileRevision: revision, walletRevision };
    if ((current?.walletRevision || 0) > walletRevision) {
      result.totalPoints = current.totalPoints;
      result.level = current.level;
      result.walletRevision = current.walletRevision;
    } else {
      result.totalPoints = profile.totalPoints || 0;
      result.level = profile.level || 1;
      result.walletRevision = walletRevision;
    }
    return result;
  });
}

async function updateMemberCount(db) {
  const profiles = await db.ref('public_profiles').get();
  await db.ref('public_stats/members').set(profiles.numChildren());
}

async function syncProfile(db, uid) {
  await withMemberAction(db, uid, () => publishProfile(db, uid));
  await updateMemberCount(db);
  return { success: true };
}

module.exports = { publishProfile, syncProfile, updateMemberCount };
