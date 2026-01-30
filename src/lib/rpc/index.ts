// Re-export RPC clients
export { videosRpc } from './videos';
export { modulesRpc } from './modules';
export { enrollmentsRpc } from './enrollments';

// Re-export types from videos
export type {
  Video,
  VideoVisibility,
  VideoStatus,
  VideoPlayback,
  CreateUploadUrlRequest,
  CreateUploadUrlResponse,
  VideoListResponse,
  VideoDetailResponse,
  UpdateVideoRequest,
  DeleteVideoResult,
  EncodingStatusResponse,
  ListVideosOptions,
} from './videos';

// Re-export types from modules
export type {
  Module,
  Unit,
  Lesson,
  CreateModuleRequest,
  UpdateModuleRequest,
  CreateUnitRequest,
  UpdateUnitRequest,
  CreateLessonRequest,
  UpdateLessonRequest,
  ModuleListResponse,
  ModuleDetailResponse,
  UnitResponse,
  LessonResponse,
  DeleteResponse,
  RegenerateKeyResponse,
} from './modules';

// Re-export types from enrollments
export type {
  Enrollment,
  LessonProgress,
  EnrollmentWithModule,
  JoinModuleRequest,
  JoinModuleResponse,
  EnrollmentListResponse,
  EnrollmentDetailResponse,
  ProgressStats,
  LessonWithProgress,
  ModuleProgressResponse,
  UpdateProgressRequest,
  ProgressResponse,
  ModuleEnrollmentsResponse,
} from './enrollments';

// Re-export client utilities
export {
  getBaseUrl,
  apiFetch,
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  type ApiResponse,
} from './client';
