"use client";

export default function BlogsError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div className="container py-12 px-4 max-w-3xl mx-auto text-center">
      <p className="text-destructive text-sm mb-4">
        Something went wrong loading this page.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="text-sm font-medium text-teal-400 hover:text-teal-300"
      >
        Try again
      </button>
    </div>
  );
}
