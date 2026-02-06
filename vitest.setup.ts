import '@testing-library/jest-dom/vitest';

process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456:web:abc';
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.ADMIN_ACCESS_KEY = 'admin-test-key';
process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{}';
