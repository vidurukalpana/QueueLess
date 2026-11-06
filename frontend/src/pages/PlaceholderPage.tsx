interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
    </main>
  )
}
