import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, logout } from '../helpers/auth.js';
import { BASE_URL, API_BASE, JSON_HEADERS } from '../config.js';

export const options = {
  stages: [
    { duration: '20s', target: 10 },  // warm up
    { duration: '30s', target: 10 },  // normal load
    { duration: '20s', target: 20 },  // ramp to above normal
    { duration: '30s', target: 20 },  // hold above normal
    { duration: '20s', target: 30 },  // ramp to high
    { duration: '30s', target: 30 },  // hold high load
    { duration: '20s', target: 40 },  // ramp to stress
    { duration: '30s', target: 40 },  // hold stress
    { duration: '20s', target: 0 },   // recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% under 5s (more lenient)
    http_req_failed: ['rate<0.15'],    // Allow up to 15% failures under stress
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

  group('03_BrowseEmployees', () => {
    const empRes = http.get(
      `${API_BASE}/pim/employees?limit=14&offset=0&sortField=employee.firstName&sortOrder=ASC`,
      JSON_HEADERS
    );
    check(empRes, {
      'employee list loaded': (r) => r.status === 200,
    });

    sleep(1);
  });

  group('04_BrowseAdmin', () => {
    const usersRes = http.get(
      `${API_BASE}/admin/users?limit=14&offset=0&sortField=u.userName&sortOrder=ASC`,
      JSON_HEADERS
    );
    check(usersRes, {
      'admin users list loaded': (r) => r.status === 200,
    });

    sleep(1);
  });

  group('05_Logout', () => {
    logout();
    sleep(0.5);
  });
}
