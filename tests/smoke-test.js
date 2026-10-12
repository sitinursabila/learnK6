import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { login, logout } from '../helpers/auth.js';
import { BASE_URL, API_BASE, DEFAULT_THRESHOLDS, JSON_HEADERS } from '../config.js';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    http_req_duration: ['p(95)<3000'], // More lenient for smoke
  },
};

export default function () {
  group('01_Login', () => {
    login();
    sleep(1);
  });

  group('02_Dashboard', () => {
    // Load dashboard page
    const dashboardRes = http.get(`${BASE_URL}/web/index.php/dashboard/index`);
    check(dashboardRes, {
      'dashboard page loaded': (r) => r.status === 200,
    });

    // Fetch dashboard API data
    const endpoints = [
      `${API_BASE}/dashboard/employees/subunit`,
      `${API_BASE}/dashboard/employees/locations`,
      `${API_BASE}/dashboard/shortcuts`,
    ];

    endpoints.forEach((url) => {
      const res = http.get(url, JSON_HEADERS);
      check(res, {
        [`GET ${url.split('/api/v2/')[1]} - status 200`]: (r) => r.status === 200,
      });
    });

    sleep(1);
  });

  group('03_Logout', () => {
    logout();
    sleep(1);
  });
}

export function handleSummary(data) {
  return {
    "reports/smoke-test-report.html": htmlReport(data),
    "reports/smoke-test-summary.json": JSON.stringify(data, null, 2),
  };
}
