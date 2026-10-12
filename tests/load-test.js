import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, logout } from '../helpers/auth.js';
import { BASE_URL, API_BASE, DEFAULT_THRESHOLDS, JSON_HEADERS } from '../config.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up
    { duration: '1m', target: 10 },   // sustain
    { duration: '10s', target: 0 },   // ramp down
  ],
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'group_duration{group:::01_Login}': ['p(95)<5000'],
    'group_duration{group:::02_Dashboard}': ['p(95)<5000'],
  },
};

export default function () {
  group('01_Login', () => {
    login();
    sleep(1);
  });

  group('02_Dashboard', () => {
    const dashboardRes = http.get(`${BASE_URL}/web/index.php/dashboard/index`);
    check(dashboardRes, {
      'dashboard page loaded': (r) => r.status === 200,
    });

    // Simulate user browsing dashboard data
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

    sleep(2); // User reads dashboard
  });

  group('03_BrowseEmployees', () => {
    // Navigate to employee list
    const empRes = http.get(
      `${API_BASE}/pim/employees?limit=14&offset=0&sortField=employee.firstName&sortOrder=ASC`,
      JSON_HEADERS
    );
    check(empRes, {
      'employee list loaded': (r) => r.status === 200,
    });

    sleep(2); // User reviews the list
  });

  group('04_Logout', () => {
    logout();
    sleep(1);
  });
}
