-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('BOOK', 'SPEECH', 'ARTICLE', 'INTERVIEW', 'SCRIPTURE', 'LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('TOPIC', 'EMOTION', 'ACTION', 'VALUE', 'TIME', 'PERSON');

-- CreateEnum
CREATE TYPE "AttributionStatus" AS ENUM ('CONFIRMED', 'DISPUTED', 'MISATTRIBUTED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FAQPageType" AS ENUM ('TAG', 'CATEGORY', 'AUTHOR', 'QUOTE', 'COLLECTION');

-- CreateEnum
CREATE TYPE "CollectionVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'EDITORIAL');

-- CreateTable
CREATE TABLE "Admin" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "birthYear" INTEGER,
    "deathYear" INTEGER,
    "dateOfBirth" TIMESTAMP(3),
    "dateOfDeath" TIMESTAMP(3),
    "nationality" TEXT,
    "profession" TEXT,
    "imageUrl" TEXT,
    "wikipediaUrl" TEXT,
    "wikidataId" TEXT,
    "quoteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "WorkType" NOT NULL,
    "year" INTEGER,
    "yearApproximate" BOOLEAN NOT NULL DEFAULT false,
    "publisher" TEXT,
    "location" TEXT,
    "description" TEXT,
    "externalUrl" TEXT,
    "authorId" UUID,
    "quoteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "quoteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "TagType" NOT NULL,
    "description" TEXT,
    "quoteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "CollectionVisibility" NOT NULL DEFAULT 'PUBLIC',
    "quoteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "wordCount" INTEGER,
    "searchVector" tsvector,
    "slug" TEXT NOT NULL,
    "normalizedContent" TEXT,
    "contentHash" TEXT NOT NULL,
    "authorId" UUID,
    "authorName" TEXT,
    "authorSlug" TEXT,
    "sourceId" UUID,
    "categoryId" UUID NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "tagSlugs" TEXT[],
    "randomKey" DOUBLE PRECISION NOT NULL DEFAULT random(),
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "popularityScore" INTEGER NOT NULL DEFAULT 0,
    "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendingViews24h" INTEGER NOT NULL DEFAULT 0,
    "trendingShares24h" INTEGER NOT NULL DEFAULT 0,
    "rankScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "attributionStatus" "AttributionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "verificationConfidence" DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    "verificationNote" TEXT,
    "adminSortKey" INTEGER NOT NULL DEFAULT 0,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID,
    "publishedById" UUID,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteTag" (
    "quoteId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "QuoteTag_pkey" PRIMARY KEY ("quoteId","tagId")
);

-- CreateTable
CREATE TABLE "QuoteCollection" (
    "quoteId" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "position" INTEGER,

    CONSTRAINT "QuoteCollection_pkey" PRIMARY KEY ("quoteId","collectionId")
);

-- CreateTable
CREATE TABLE "QuoteSlugHistory" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "quoteId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteSlugHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteReport" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteDailyStat" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "pageType" "FAQPageType" NOT NULL,
    "pageSlug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Author_nameNormalized_key" ON "Author"("nameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");

-- CreateIndex
CREATE INDEX "Author_nameNormalized_idx" ON "Author"("nameNormalized");

-- CreateIndex
CREATE INDEX "Author_quoteCount_idx" ON "Author"("quoteCount");

-- CreateIndex
CREATE UNIQUE INDEX "Source_slug_key" ON "Source"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_quoteCount_idx" ON "Category"("quoteCount");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_type_idx" ON "Tag"("type");

-- CreateIndex
CREATE INDEX "Tag_quoteCount_idx" ON "Tag"("quoteCount");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Quote_status_publishedAt_idx" ON "Quote"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Quote_authorId_status_idx" ON "Quote"("authorId", "status");

-- CreateIndex
CREATE INDEX "Quote_authorSlug_idx" ON "Quote"("authorSlug");

-- CreateIndex
CREATE INDEX "Quote_categorySlug_idx" ON "Quote"("categorySlug");

-- CreateIndex
CREATE INDEX "Quote_categorySlug_status_publishedAt_idx" ON "Quote"("categorySlug", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Quote_authorSlug_status_publishedAt_idx" ON "Quote"("authorSlug", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Quote_language_status_idx" ON "Quote"("language", "status");

-- CreateIndex
CREATE INDEX "Quote_randomKey_idx" ON "Quote"("randomKey");

-- CreateIndex
CREATE INDEX "Quote_views_idx" ON "Quote"("views");

-- CreateIndex
CREATE INDEX "Quote_trendingScore_idx" ON "Quote"("trendingScore");

-- CreateIndex
CREATE INDEX "Quote_rankScore_idx" ON "Quote"("rankScore");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_contentHash_language_key" ON "Quote"("contentHash", "language");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_slug_language_key" ON "Quote"("slug", "language");

-- CreateIndex
CREATE INDEX "QuoteTag_tagId_idx" ON "QuoteTag"("tagId");

-- CreateIndex
CREATE INDEX "QuoteTag_quoteId_idx" ON "QuoteTag"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteCollection_collectionId_idx" ON "QuoteCollection"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteSlugHistory_slug_key" ON "QuoteSlugHistory"("slug");

-- CreateIndex
CREATE INDEX "QuoteDailyStat_quoteId_idx" ON "QuoteDailyStat"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteDailyStat_date_idx" ON "QuoteDailyStat"("date");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteDailyStat_quoteId_date_key" ON "QuoteDailyStat"("quoteId", "date");

-- CreateIndex
CREATE INDEX "FAQ_pageType_pageSlug_idx" ON "FAQ"("pageType", "pageSlug");

-- CreateIndex
CREATE INDEX "FAQ_pageType_pageSlug_position_idx" ON "FAQ"("pageType", "pageSlug", "position");

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteTag" ADD CONSTRAINT "QuoteTag_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteTag" ADD CONSTRAINT "QuoteTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteCollection" ADD CONSTRAINT "QuoteCollection_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteCollection" ADD CONSTRAINT "QuoteCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteSlugHistory" ADD CONSTRAINT "QuoteSlugHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteReport" ADD CONSTRAINT "QuoteReport_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDailyStat" ADD CONSTRAINT "QuoteDailyStat_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
