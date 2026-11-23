import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { normalizeWikimediaThumbnailUrl } from "../../src/lib/formatters"

describe("Author Image URL Normalization for Mobile Compatibility", () => {
  it("returns null for empty, null, or undefined URLs", () => {
    assert.equal(normalizeWikimediaThumbnailUrl(null), null)
    assert.equal(normalizeWikimediaThumbnailUrl(undefined), null)
    assert.equal(normalizeWikimediaThumbnailUrl(""), null)
    assert.equal(normalizeWikimediaThumbnailUrl("   "), null)
  })

  it("upgrades insecure HTTP Wikimedia URLs to HTTPS to prevent mobile mixed-content blocks", () => {
    const httpUrl = "http://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/File.jpg/500px-File.jpg"
    assert.equal(
      normalizeWikimediaThumbnailUrl(httpUrl),
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/File.jpg/500px-File.jpg"
    )

    const httpCommons = "http://commons.wikimedia.org/wiki/Special:FilePath/Sample.jpg"
    assert.equal(
      normalizeWikimediaThumbnailUrl(httpCommons),
      "https://commons.wikimedia.org/wiki/Special:FilePath/Sample.jpg?width=640"
    )
  })

  it("rewrites legacy thumb.wikimedia.org hosts to canonical upload.wikimedia.org", () => {
    const legacyUrl = "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Photo.jpg/640px-Photo.jpg"
    assert.equal(
      normalizeWikimediaThumbnailUrl(legacyUrl),
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Photo.jpg/640px-Photo.jpg"
    )
  })

  it("appends ?width=640 to Special:FilePath URLs lacking a width parameter to prevent mobile timeouts and OOM", () => {
    const specialUrl = "https://commons.wikimedia.org/wiki/Special:FilePath/Confucius%2C%20fresco.jpg"
    assert.equal(
      normalizeWikimediaThumbnailUrl(specialUrl),
      "https://commons.wikimedia.org/wiki/Special:FilePath/Confucius%2C%20fresco.jpg?width=640"
    )
  })

  it("preserves existing valid width parameter on Special:FilePath URLs while stripping tracking parameters", () => {
    const specialWithWidth = "https://commons.wikimedia.org/wiki/Special:FilePath/Beatrice_Mintz.jpg?width=500&utm_source=test&origin=*"
    assert.equal(
      normalizeWikimediaThumbnailUrl(specialWithWidth),
      "https://commons.wikimedia.org/wiki/Special:FilePath/Beatrice_Mintz.jpg?width=500"
    )
  })

  it("converts raw un-thumbnailed TIFF images to Special:FilePath JPEG thumbnails for mobile rendering", () => {
    const rawTiff = "https://upload.wikimedia.org/wikipedia/commons/4/4c/George_Burns_Allan_Warren.tif"
    assert.equal(
      normalizeWikimediaThumbnailUrl(rawTiff),
      "https://commons.wikimedia.org/wiki/Special:FilePath/George_Burns_Allan_Warren.tif?width=640"
    )
  })

  it("enforces 960px bucket size for existing Wikimedia Commons TIFF thumbnails", () => {
    const tiffThumb = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Garfinkel2.TIF/lossy-page1-500px-Garfinkel2.TIF.jpg"
    assert.equal(
      normalizeWikimediaThumbnailUrl(tiffThumb),
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Garfinkel2.TIF/lossy-page1-960px-Garfinkel2.TIF.jpg"
    )
  })

  it("strips API tracking queries from standard Wikimedia assets", () => {
    const trackedUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Hans-Zimmer.jpg/500px-Hans-Zimmer.jpg?utm_source=twitter"
    assert.equal(
      normalizeWikimediaThumbnailUrl(trackedUrl),
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Hans-Zimmer.jpg/500px-Hans-Zimmer.jpg"
    )
  })
})
