import withPWAInit from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js config options can go here
};

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // Rule for caching Supabase data (exams, courses, quizzes)
      urlPattern: /^https?:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'supabase-data-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // Rule for syncing failed quiz attempt submissions
      urlPattern: '/api/quiz/attempt',
      handler: 'NetworkOnly',
      method: 'POST',
      options: {
        backgroundSync: {
          name: 'quiz-attempt-sync-queue',
          options: {
            maxRetentionTime: 24 * 60, // 24 hours
          },
        },
      },
    },
  ],
});

export default withPWA(nextConfig);