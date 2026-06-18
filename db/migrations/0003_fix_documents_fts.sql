-- Fix full-text search for documents.
--
-- 0002_search_fts5.sql created documents_fts as an FTS5 *external-content* table
-- (content=document_metadata), but document_metadata has no `content` column
-- (it stores `description`). Any query against documents_fts therefore fails
-- with "no such column: T.content", which breaks ALL search because the query
-- builder always searches documents first.
--
-- Recreate documents_fts as a standard FTS5 table that stores its own content.
-- The indexer (indexer.server.ts) and the metadata-sync triggers populate it
-- directly; the other *_fts tables were already standard tables and are fine.

DROP TRIGGER IF EXISTS document_metadata_ai;
DROP TRIGGER IF EXISTS document_metadata_ad;
DROP TRIGGER IF EXISTS document_metadata_au;
DROP TABLE IF EXISTS documents_fts;

CREATE VIRTUAL TABLE documents_fts USING fts5(
  doc_path UNINDEXED,
  title,
  content,
  category,
  tokenize='porter unicode61'
);

-- Weight title higher than content (preserves the original ranking intent).
INSERT INTO documents_fts(documents_fts, rank) VALUES('rank', 'bm25(10.0, 5.0, 1.0, 1.0)');

-- Keep documents_fts in sync with document_metadata (description -> content).
CREATE TRIGGER document_metadata_ai AFTER INSERT ON document_metadata BEGIN
  INSERT INTO documents_fts(doc_path, title, content, category)
  VALUES (new.doc_path, new.title, new.description, new.category);
END;

CREATE TRIGGER document_metadata_ad AFTER DELETE ON document_metadata BEGIN
  DELETE FROM documents_fts WHERE doc_path = old.doc_path;
END;

CREATE TRIGGER document_metadata_au AFTER UPDATE ON document_metadata BEGIN
  DELETE FROM documents_fts WHERE doc_path = old.doc_path;
  INSERT INTO documents_fts(doc_path, title, content, category)
  VALUES (new.doc_path, new.title, new.description, new.category);
END;

-- Backfill from any existing document_metadata rows.
INSERT INTO documents_fts(doc_path, title, content, category)
SELECT doc_path, title, description, category FROM document_metadata;
