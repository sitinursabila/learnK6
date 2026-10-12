import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, CREDENTIALS } from '../config.js';

/**
 * Performs login to OrangeHRM and returns the authenticated cookie jar.
 *
 * Flow:
 * 1. GET login page → extract CSRF token from HTML
 * 2. POST /auth/validate with credentials + CSRF token
 * 3. Return the cookie jar for subsequent authenticated requests
 */
export function login(username = CREDENTIALS.username, password = CREDENTIALS.password) {
  // Step 1: Get login page and extract CSRF token
  const loginPageRes = http.get(`${BASE_URL}/web/index.php/auth/login`);

  check(loginPageRes, {
    'login page loaded': (r) => r.status === 200,
  });

  // Extract the CSRF token from the page HTML
  // OrangeHRM embeds it in the Vue component as :token="&quot;TOKEN_VALUE&quot;"
  // Try multiple patterns in case the format varies
  let csrfToken = null;

  // Pattern 1: Vue component attribute — :token="&quot;TOKEN&quot;"
  const vueTokenMatch = loginPageRes.body.match(/:token="&quot;([^&]+)&quot;"/);
  if (vueTokenMatch) {
    csrfToken = vueTokenMatch[1];
  }

  // Pattern 2: Hidden input field — <input name="_token" value="TOKEN">
  if (!csrfToken) {
    const inputTokenMatch = loginPageRes.body.match(/name="_token"\s+value="([^"]+)"/);
    if (inputTokenMatch) {
      csrfToken = inputTokenMatch[1];
    }
  }

  // Pattern 3: Meta tag — <meta name="csrf-token" content="TOKEN">
  if (!csrfToken) {
    const metaTokenMatch = loginPageRes.body.match(/name="csrf-token"\s+content="([^"]+)"/);
    if (metaTokenMatch) {
      csrfToken = metaTokenMatch[1];
    }
  }

  if (!csrfToken) {
    console.error('Could not extract CSRF token. Response body snippet:');
    console.error(loginPageRes.body.substring(0, 500));
    return null;
  }

  // Step 2: Submit login form
  const loginPayload = {
    username: username,
    password: password,
    _token: csrfToken,
  };

  const loginRes = http.post(
    `${BASE_URL}/web/index.php/auth/validate`,
    loginPayload,
    { redirects: 0 } // Don't follow redirect to capture the session cookie
  );

  check(loginRes, {
    'login successful (302 redirect)': (r) => r.status === 302,
  });

  return loginRes;
}

/**
 * Performs logout to properly end the session.
 */
export function logout() {
  const res = http.get(`${BASE_URL}/web/index.php/auth/logout`, {
    redirects: 0,
  });

  check(res, {
    'logout successful': (r) => r.status === 302 || r.status === 200,
  });
}
