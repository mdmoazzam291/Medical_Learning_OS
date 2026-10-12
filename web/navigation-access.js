export async function resolvePinnedAccess(prefs, readAccess) {
  if (!prefs.pins?.some(key => key === 'account:admin' || key === 'admin:overview')) return false;
  try { return (await readAccess())?.isAdmin === true; }
  catch { return false; }
}

export async function resolveAdminAccess(readAccess) {
  try { return (await readAccess())?.isAdmin === true; }
  catch { return false; }
}
