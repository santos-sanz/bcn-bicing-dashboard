export const ACCESS_RULES = {
  enableEmailRestriction: true, // Cambia a false para desactivar la verificación
  allowedDomains: ['uoc.edu'],
};

export function hasAccess(email: string | undefined | null): boolean {
  if (!ACCESS_RULES.enableEmailRestriction) return true;
  if (!email) return false;
  
  return ACCESS_RULES.allowedDomains.some(domain => email.endsWith(`@${domain}`));
}