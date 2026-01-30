-- Migration: Add transcript chunks table for RAG
-- Stores chunked transcript segments with metadata for semantic search

CREATE TABLE transcript_chunks (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index for fetching chunks by video
CREATE INDEX idx_chunks_video ON transcript_chunks(video_id);

-- Index for filtering by module (for module-wide search)
CREATE INDEX idx_chunks_module ON transcript_chunks(module_id);

-- Index for time-range queries within a video
CREATE INDEX idx_chunks_time ON transcript_chunks(video_id, start_time);
