// Cookie utility functions

/**
 * Set a cookie
 * @param name Cookie name
 * @param value Cookie value
 * @param days Number of days until expiration (default: 30)
 */
export const setCookie = (name: string, value: string, days: number = 30): void => {
  if (typeof window === 'undefined') return;
  
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  
  // Set cookie with secure and SameSite attributes for better security
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
};

/**
 * Get a cookie value
 * @param name Cookie name
 * @returns Cookie value or null if not found
 */
export const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  
  return null;
};

/**
 * Remove a cookie
 * @param name Cookie name
 */
export const removeCookie = (name: string): void => {
  if (typeof window === 'undefined') return;
  
  // Set expiration date to past to delete cookie
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};
