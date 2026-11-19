import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  extractAuthorMetaDescription,
  generateAuthorPageTitle,
  buildAuthorKnowledgeGraph,
} from "../../src/lib/authors/seo"

describe("🔍 SEO & Knowledge Graph Entity Optimization", () => {
  describe("extractAuthorMetaDescription", () => {
    it("returns clean sentence-aware meta description under 160 characters", () => {
      const bio =
        "Marcus Aurelius (121–180 AD) was Roman Emperor and a dedicated Stoic philosopher. Stationed along the frozen Danube frontier, he penned his private reflections in Greek titled Meditations.\n\nRather than offering abstract doctrine, he practiced Stoicism daily."

      const desc = extractAuthorMetaDescription({
        name: "Marcus Aurelius",
        profession: "Roman Emperor & Stoic Philosopher",
        bio,
      })

      assert.ok(desc.length >= 60, `Expected length >= 60, got ${desc.length}`)
      assert.ok(desc.length <= 160, `Expected length <= 160, got ${desc.length}`)
      assert.ok(!desc.includes("\n"), "Should not contain newlines")
      // Should capture the complete first sentence
      assert.ok(desc.includes("Roman Emperor and a dedicated Stoic philosopher."))
    })

    it("truncates long single sentences cleanly on word boundaries without mid-word cutting", () => {
      const longSentenceBio =
        "Marcus Aurelius Antoninus Augustus was a Roman emperor from 161 to 180 and a Stoic philosopher who ruled with his adoptive brother Lucius Verus until Verus' death in 169 and subsequently with his son Commodus."

      const desc = extractAuthorMetaDescription({
        name: "Marcus Aurelius",
        profession: "Emperor",
        bio: longSentenceBio,
      })

      assert.ok(desc.length <= 160, `Length <= 160 chars, got ${desc.length}`)
      assert.ok(desc.endsWith("..."), "Should end with ellipsis when truncated")
      // Ensure it did not split inside a word like 'adop' or 'phi'
      const withoutEllipsis = desc.replace(/\.\.\.$/, "")
      assert.ok(!withoutEllipsis.endsWith(" "), "Should not end with whitespace before ellipsis")
    })

    it("provides high-intent fallback when bio is absent or very short", () => {
      const desc = extractAuthorMetaDescription({
        name: "Epictetus",
        profession: "Greek Stoic Philosopher",
        bio: "",
      })

      assert.ok(desc.length >= 80, `Expected fallback length >= 80, got ${desc.length}`)
      assert.ok(desc.length <= 160, `Expected fallback length <= 160, got ${desc.length}`)
      assert.ok(desc.includes("Epictetus"))
      assert.ok(desc.includes("Greek Stoic Philosopher"))
    })

    it("strips internal markdown links cleanly from SERP snippet text", () => {
      const bioWithLinks =
        "Marcus Aurelius (121–180 AD) was Roman Emperor and Stoic philosopher who authored [Meditations](/sources/meditations). He explored [Stoic resilience](/categories/resilience) under imperial adversity."

      const desc = extractAuthorMetaDescription({
        name: "Marcus Aurelius",
        profession: "Roman Emperor & Stoic Philosopher",
        bio: bioWithLinks,
      })

      assert.ok(!desc.includes("[Meditations]"), "Should strip markdown link bracket")
      assert.ok(!desc.includes("(/sources/meditations)"), "Should strip markdown link URL")
      assert.ok(desc.includes("Meditations"), "Should retain anchor text")
      assert.ok(desc.includes("Stoic resilience"), "Should retain anchor text")
    })
  })

  describe("generateAuthorPageTitle", () => {
    it("creates search-intent optimized titles with cleaned profession", () => {
      const title = generateAuthorPageTitle({
        name: "Marcus Aurelius",
        profession: "Roman Emperor & Stoic Philosopher",
      })

      assert.equal(title, "Marcus Aurelius Quotes & Philosophy - Roman Emperor & Stoic Philosopher")
    })

    it("falls back cleanly when profession is missing", () => {
      const title = generateAuthorPageTitle({
        name: "Heraclitus",
      })

      assert.equal(title, "Heraclitus Quotes & Philosophy - Quotzen")
    })
  })

  describe("buildAuthorKnowledgeGraph", () => {
    it("generates a rich Schema.org @graph with Person, BreadcrumbList, and CollectionPage", () => {
      const graphResult = buildAuthorKnowledgeGraph({
        name: "Marcus Aurelius",
        slug: "marcus-aurelius",
        profession: "Roman Emperor & Stoic Philosopher",
        nationality: "Roman",
        birthYear: 121,
        deathYear: 180,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/marcus.jpg",
        wikipediaUrl: "https://en.wikipedia.org/wiki/Marcus_Aurelius",
        wikidataId: "Q1430",
        quoteCount: 42,
        topCategories: [
          { id: "cat-1", name: "Stoicism", slug: "stoicism" },
          { id: "cat-2", name: "Resilience", slug: "resilience" },
        ],
        sources: [
          {
            id: "src-1",
            title: "Meditations",
            slug: "meditations",
            type: "BOOK",
            year: 170,
          },
        ],
        bio: "Marcus Aurelius (121–180 AD) was Roman Emperor and Stoic philosopher.",
      })

      assert.equal(graphResult["@context"], "https://schema.org")
      const graph = graphResult["@graph"] as Array<Record<string, unknown>>
      assert.ok(Array.isArray(graph), "@graph should be an array")
      assert.equal(graph.length, 3, "Should contain Person, BreadcrumbList, and CollectionPage")

      const person = graph.find((node) => node["@type"] === "Person")
      assert.ok(person, "Person entity should exist")
      assert.equal(person.name, "Marcus Aurelius")
      assert.equal(person.jobTitle, "Roman Emperor & Stoic Philosopher")
      assert.equal(person.birthDate, "121")
      assert.equal(person.deathDate, "180")
      assert.deepEqual(person.knowsAbout, ["Stoicism", "Resilience"])

      // Verify sameAs authority identifiers
      const sameAs = person.sameAs as string[]
      assert.ok(sameAs.includes("https://en.wikipedia.org/wiki/Marcus_Aurelius"))
      assert.ok(sameAs.includes("https://www.wikidata.org/wiki/Q1430"))

      // Verify workExample
      const works = person.workExample as Array<Record<string, unknown>>
      assert.ok(Array.isArray(works) && works.length === 1)
      assert.equal(works[0]["@type"], "Book")
      assert.equal(works[0].name, "Meditations")

      // Verify Breadcrumbs
      const breadcrumbs = graph.find((node) => node["@type"] === "BreadcrumbList")
      assert.ok(breadcrumbs, "Breadcrumbs entity should exist")
      const items = breadcrumbs.itemListElement as Array<Record<string, unknown>>
      assert.equal(items.length, 3)
      assert.equal(items[0].name, "Home")
      assert.equal(items[1].name, "Authors")
      assert.equal(items[2].name, "Marcus Aurelius")

      // Verify CollectionPage
      const collection = graph.find((node) => node["@type"] === "CollectionPage")
      assert.ok(collection, "CollectionPage entity should exist")
      assert.deepEqual(collection.about, { "@id": person["@id"] })
    })

    it("generates Schema.org FAQPage entity and relatedTo relationships when faqs and companion thinkers are provided", () => {
      const graphResult = buildAuthorKnowledgeGraph({
        name: "Marcus Aurelius",
        slug: "marcus-aurelius",
        profession: "Stoic Philosopher",
        faqs: [
          {
            question: "What was Marcus Aurelius's main philosophy?",
            answer: "He practiced late Roman Stoicism, emphasizing duty and the dichotomy of control.",
          },
          {
            question: "Why did he write Meditations?",
            answer: "It was a private journal for self-discipline written during the Danube campaigns.",
          },
        ],
        companionThinkers: {
          influences: ["Epictetus", "Rusticus"],
          influenced: ["Montaigne"],
          contrasts: ["Epicurus"],
        },
      })

      const graph = graphResult["@graph"] as Array<Record<string, unknown>>
      assert.equal(graph.length, 4, "Should contain Person, BreadcrumbList, CollectionPage, and FAQPage")

      const person = graph.find((node) => node["@type"] === "Person")
      assert.ok(person)
      const relatedTo = person.relatedTo as Array<{ "@type": string; name: string }>
      assert.ok(Array.isArray(relatedTo), "Person should have relatedTo array")
      assert.equal(relatedTo.length, 4)
      assert.deepEqual(relatedTo[0], { "@type": "Person", name: "Epictetus" })

      const faqPage = graph.find((node) => node["@type"] === "FAQPage")
      assert.ok(faqPage, "FAQPage entity should be present in @graph")
      const mainEntity = faqPage.mainEntity as Array<Record<string, unknown>>
      assert.ok(Array.isArray(mainEntity))
      assert.equal(mainEntity.length, 2)
      assert.equal(mainEntity[0]["@type"], "Question")
      assert.equal(mainEntity[0].name, "What was Marcus Aurelius's main philosophy?")
      const answer0 = mainEntity[0].acceptedAnswer as Record<string, unknown>
      assert.equal(answer0["@type"], "Answer")
      assert.equal(
        answer0.text,
        "He practiced late Roman Stoicism, emphasizing duty and the dichotomy of control."
      )
    })
  })
})
