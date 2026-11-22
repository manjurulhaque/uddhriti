-- Create trigger function to maintain searchVector
CREATE OR REPLACE FUNCTION quote_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW."content", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."authorName", '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW."meaning", '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW."historicalContext", '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW."modernRelevance", '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger on Quote table
DROP TRIGGER IF EXISTS trg_quote_search_vector_update ON "Quote";
CREATE TRIGGER trg_quote_search_vector_update
BEFORE INSERT OR UPDATE OF "content", "authorName", "meaning", "historicalContext", "modernRelevance"
ON "Quote"
FOR EACH ROW
EXECUTE FUNCTION quote_search_vector_update();

-- Create GIN index on Quote(searchVector)
CREATE INDEX IF NOT EXISTS "Quote_searchVector_idx" ON "Quote" USING gin ("searchVector");

-- Backfill any existing rows
UPDATE "Quote"
SET "searchVector" = (
  setweight(to_tsvector('english', COALESCE("content", '')), 'A') ||
  setweight(to_tsvector('english', COALESCE("authorName", '')), 'B') ||
  setweight(to_tsvector('english', COALESCE("meaning", '')), 'C') ||
  setweight(to_tsvector('english', COALESCE("historicalContext", '')), 'D') ||
  setweight(to_tsvector('english', COALESCE("modernRelevance", '')), 'D')
)
WHERE "searchVector" IS NULL;

