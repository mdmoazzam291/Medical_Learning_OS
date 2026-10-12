// The visible Admin master is discovered via an authenticated, authoritative grant.
// Neither URL parameters nor device-local navigation preferences confer access.
export async function resolveAdminAccess(readAccess) {
  try { return (await readAccess())?.isAdmin === true; }
  catch { return false; }
}
