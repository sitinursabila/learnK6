// Shared configuration for all k6 tests
export const BASE_URL = 'https://opensource-demo.orangehrmlive.com';
export const API_BASE = `${BASE_URL}/web/index.php/api/v2`;

export const CREDENTIALS = {
  username: __ENV.K6_USERNAME || 'Admin',
  password: __ENV.K6_PASSWORD || 'admin123',
};

// Common thresholds
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
  http_req_failed: ['rate<0.05'],    // Less than 5% failure rate
};

// HTTP params with common headers
export const JSON_HEADERS = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};
