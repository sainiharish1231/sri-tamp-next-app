"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function NotFoundScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-4" size={64} color="#6366f1" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-8">This page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-block bg-indigo-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-indigo-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
