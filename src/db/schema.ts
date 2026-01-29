import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ============================================================================
// AUTH TABLES (NextAuth compatible)
// ============================================================================

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  emailVerified: integer("email_verified", { mode: 'timestamp' }),
  image: text("image"),
  password: text("password"),
  role: text("role").notNull().default('student'), // 'student' | 'teacher' | 'admin'
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const accounts = sqliteTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: 'timestamp' }).notNull(),
});

export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// LEARNING CONTENT TABLES
// ============================================================================

/**
 * Modules - Top level learning containers created by teachers
 * Example: "JavaScript Fundamentals", "React Mastery"
 */
export const modules = sqliteTable("modules", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),  // Optional cover image URL
  enrollmentKey: text("enrollment_key").unique(),  // Unique key for student enrollment
  status: text("status").notNull().default("draft"), // draft | published | archived
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

/**
 * Units - Organized sections within a module
 * Example: "Variables & Data Types", "Functions"
 */
export const units = sqliteTable("units", {
  id: text("id").primaryKey(),
  moduleId: text("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

/**
 * Lessons - Individual learning items within a unit
 * Example: "Introduction to Variables", "Working with Strings"
 */
export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  unitId: text("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type").notNull().default("video"), // video | text | quiz
  sortOrder: integer("sort_order").notNull().default(0),
  isFree: integer("is_free", { mode: "boolean" }).notNull().default(false), // Preview lessons
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ============================================================================
// ENROLLMENT & PROGRESS TABLES
// ============================================================================

/**
 * Enrollments - Links students to modules they can access
 */
export const enrollments = sqliteTable("enrollments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  moduleId: text("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // active | completed | expired | cancelled
  enrolledAt: text("enrolled_at").notNull().default(sql`(datetime('now'))`),
  expiresAt: text("expires_at"),  // Optional enrollment expiration
  completedAt: text("completed_at"),
});

/**
 * Lesson Progress - Tracks student completion of lessons
 */
export const lessonProgress = sqliteTable("lesson_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("not_started"), // not_started | in_progress | completed
  progressPercent: integer("progress_percent").notNull().default(0), // 0-100
  watchedSeconds: integer("watched_seconds").notNull().default(0), // For video lessons
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  lastAccessedAt: text("last_accessed_at").notNull().default(sql`(datetime('now'))`),
});

// ============================================================================
// VIDEOS TABLE (R2 Storage + GCP Encoding)
// ============================================================================

export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").references(() => lessons.id, { onDelete: "set null" }), // Link to lesson
  title: text("title").notNull(),
  description: text("description"),

  // R2 Storage paths
  r2RawPath: text("r2_raw_path"),           // "videos/raw/{videoId}/{filename}"
  r2ThumbnailPath: text("r2_thumbnail_path"), // "videos/thumbnails/{videoId}.jpg"

  // Source video metadata
  sourceWidth: integer("source_width"),
  sourceHeight: integer("source_height"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  sourceMetadata: text("source_metadata"),   // JSON: codec, bitrate, fps, etc.

  duration: integer("duration"),              // seconds, populated after processing
  status: text("status").notNull().default("pending"), // pending | uploading | encoding | ready | error
  lastError: text("last_error"),              // Last error message

  visibility: text("visibility").notNull().default("private"), // private | unlisted | public
  availableDays: integer("available_days").notNull().default(3), // Days video is available to students
  availableUntil: text("available_until"),    // Computed: createdAt + availableDays
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ============================================================================
// VIDEO VARIANTS TABLE (Encoded versions at different qualities)
// ============================================================================

export const videoVariants = sqliteTable("video_variants", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  quality: text("quality").notNull(),         // "1080p" | "720p" | "480p"
  width: integer("width"),
  height: integer("height"),
  bitrate: integer("bitrate"),                // kbps
  r2Path: text("r2_path"),                    // "videos/encoded/{videoId}/{quality}.mp4"
  fileSize: integer("file_size"),
  status: text("status").notNull().default("pending"), // pending | encoding | ready | error | skipped
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  completedAt: text("completed_at"),
});

// ============================================================================
// ENCODING JOBS TABLE (GCP encoding job tracking)
// ============================================================================

export const encodingJobs = sqliteTable("encoding_jobs", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  externalJobId: text("external_job_id"),     // GCP job ID
  jobType: text("job_type").notNull(),        // "encode" | "thumbnail"
  targetQuality: text("target_quality"),      // For encode jobs: "1080p" | "720p" | "480p"
  status: text("status").notNull().default("pending"), // pending | queued | processing | completed | failed | cancelled
  progress: integer("progress").default(0),   // 0-100
  progressMessage: text("progress_message"),
  queuedAt: text("queued_at"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  errorDetails: text("error_details"),        // JSON
  attemptNumber: integer("attempt_number").notNull().default(1),
  maxAttempts: integer("max_attempts").notNull().default(3),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Auth types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;
export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;
export type VerificationToken = InferSelectModel<typeof verificationTokens>;
export type NewVerificationToken = InferInsertModel<typeof verificationTokens>;

// Learning content types
export type Module = InferSelectModel<typeof modules>;
export type NewModule = InferInsertModel<typeof modules>;
export type Unit = InferSelectModel<typeof units>;
export type NewUnit = InferInsertModel<typeof units>;
export type Lesson = InferSelectModel<typeof lessons>;
export type NewLesson = InferInsertModel<typeof lessons>;

// Enrollment & progress types
export type Enrollment = InferSelectModel<typeof enrollments>;
export type NewEnrollment = InferInsertModel<typeof enrollments>;
export type LessonProgress = InferSelectModel<typeof lessonProgress>;
export type NewLessonProgress = InferInsertModel<typeof lessonProgress>;

// Video types
export type Video = InferSelectModel<typeof videos>;
export type NewVideo = InferInsertModel<typeof videos>;
export type VideoVariant = InferSelectModel<typeof videoVariants>;
export type NewVideoVariant = InferInsertModel<typeof videoVariants>;
export type EncodingJob = InferSelectModel<typeof encodingJobs>;
export type NewEncodingJob = InferInsertModel<typeof encodingJobs>;

// Re-export types from shared types files
export type { VideoStatus, VideoVisibility } from "@/types/video.types";
export type { ModuleStatus, LessonContentType } from "@/types/module.types";
export type { EnrollmentStatus, LessonProgressStatus } from "@/types/enrollment.types";
export type {
  VideoQuality,
  QualityStatus,
  EncodingJobStatus,
  EncodingJobType,
} from "@/types/encoding.types";
