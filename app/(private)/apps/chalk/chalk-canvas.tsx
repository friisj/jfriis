'use client'

import dynamic from "next/dynamic";

const MainCanvas = dynamic(
  () => import("@/components/studio/chalk/canvas/MainCanvas").then(mod => mod.MainCanvas),
  { ssr: false }
);

export function ChalkCanvas(props: {
  boardId: string;
  userId: string;
  initialSnapshot: unknown;
  initialViewport: unknown;
}) {
  return <MainCanvas {...props} />;
}
