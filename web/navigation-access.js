export async function resolvePinnedAccess(prefs, readAccess) {
  if (!prefs.pins?.includes('account:admin')) return false;
  try { return (await readAccess())?.isAdmin === true; }
  catch { return false; }
}
