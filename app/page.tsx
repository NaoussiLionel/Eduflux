export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-center p-8">
      <div className="max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
          Eduflux
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Supercharge your teaching and learning with AI. Create course outlines,
          generate exams, and engage with gamified quizzes—all in one place.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <a
            href="/dashboard"
            className="rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Get Started
          </a>
        </div>
      </div>
    </main>
  );
}
