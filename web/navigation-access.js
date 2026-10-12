export async function resolvePinnedAccess(prefs, readAccess, { adminRoute = false } = {}) {
  if (!prefs.pins?.includes('account:admin') && !adminRoute) return false;
  try { return (await readAccess())?.isAdmin === true; }
  catch { return false; }
}
