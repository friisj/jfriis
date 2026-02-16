export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 bg-background">{children}</div>;
}
