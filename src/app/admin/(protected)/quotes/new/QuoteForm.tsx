import QuoteEditorForm from "../QuoteEditorForm"

type Author = {
  id: string
  name: string
}

type Category = {
  id: string
  name: string
  slug?: string
}

type Source = {
  id: string
  title: string
}

type Tag = {
  id: string
  name: string
  type: string
  description?: string | null
}

export default function QuoteForm({
  authors,
  categories,
  sources,
  tags,
}: {
  authors: Author[]
  categories: Category[]
  sources: Source[]
  tags: Tag[]
}) {
  return (
    <QuoteEditorForm
      mode="create"
      authors={authors}
      categories={categories}
      sources={sources}
      tags={tags}
    />
  )
}
