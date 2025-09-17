"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

export default function Home() {
  const NflMap = useMemo(
    () => dynamic(() => import("@/components/NflMap"), { ssr: false }),
    [],
  );

  return (
    <main>
      <NflMap />
    </main>
  );
}
