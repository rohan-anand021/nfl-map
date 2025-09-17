"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import Image from "next/image";

export default function Home() {
  const NflMap = useMemo(
    () => dynamic(() => import("@/components/NflMap"), { ssr: false }),
    [],
  );

  return (
    <main className="flex flex-col h-screen bg-gray-100 dark:bg-black">
      <header className="flex items-center justify-center gap-4 p-4 bg-white dark:bg-gray-900 shadow-md">
        <Image
          src="/logos/National_Football_League_logo.svg"
          alt="NFL Logo"
          width={40}
          height={40}
          className="h-10 w-auto"
        />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          NFL Voronoi Map
        </h1>
      </header>

      {/* This container now pushes the map towards the top */}
      <div className="flex-grow flex items-start justify-center pt-8">
        <div className="w-2/3 h-2/3">
          <NflMap />
        </div>
      </div>
    </main>
  );
}
