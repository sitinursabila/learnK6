import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, logout } from '../helpers/auth.js';
import { BASE_URL, API_BASE, JSON_HEADERS } from '../config.js';

/**
 * SPIKE TEST - OrangeHRM
 *
 * Purpose: Test how the system handles a sudden surge of traffic.
 * Simulates a scenario where many users suddenly access the system
 * (e.g. morning login rush, announcement, etc.)
 *
 * Pattern:
 *   Baseline  →  2 VUs
 *   Spike!    → 30 VUs (sudden burst)
 *   Sustain   → 30 VUs (brief hold)
 *   Drop      →  2 VUs (back to normal)
 *   Recovery  →  2 VUs (verify system recovers)
 */
export const options = {
  stages: [
    { duration: '10s', target: 2 },   // baseline
    { duration: '5s', target: 30 },    // spike!
    { duration: '20s', target: 30 },   // sustain spike
    { duration: '5s', target: 2 },     // drop to normal
    { duration: '20s', target: 2 },    // recovery period
    { duration: '5s', target: 0 },     // cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<8000'], // Very lenient during spikes
    http_req_failed: ['rate<0.20'],    // Allow up to 20% failures during spike
  },
};

export default function () {
  group('01_Login', () => {
    login();
    sleep(0.5);
  });

  group('02_Dashboard', () => {
    const dashboardRes = http.get(`${BASE_URL}/web/index.php/dashboard/index`);
    check(dashboardRes, {
      'dashboard loaded': (r) => r.status === 200,
    });

    const dashboardAPIs = [
      `${API_BASE}/dashboard/employees/subunit`,
      `${API_BASE}/dashboard/employees/locations`,
      `${API_BASE}/dashboard/shortcuts`,
    ];

    dashboardAPIs.forEach((url) => {
      const res = http.get(url, JSON_HEADERS);
      check(res, {
        [`${url.split('/api/v2/')[1]} OK`]: (r) => r.status === 200,
      });
    });

    sleep(1);
  });

  group('03_Logout', () => {
    logout();
    sleep(0.5);
  });
}
