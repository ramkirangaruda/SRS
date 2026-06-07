// Shared presentational component for the public privacy/terms pages.
export function LegalPage({ title, schoolName, content }: { title: string; schoolName: string; content: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{schoolName}</p>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
      <a href="/login" className="mt-8 inline-block text-sm text-blue-600 hover:underline">← Back to login</a>
    </div>
  );
}
