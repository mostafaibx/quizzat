"use client";

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { VideoUploader } from '@/components/video-upload';

export default function VideoUploadPage() {
  const t = useTranslations('videos');
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
        <p className="text-muted-foreground">{t('pageDescription')}</p>
      </div>

      {/* Video Uploader */}
      <VideoUploader
        redirectOnSuccess={`/${locale}/teacher`}
        showLessonSelector={true}
        labels={{
          cardTitle: t('uploadTitle'),
          cardDescription: t('uploadDescription'),
          dropzone: {
            dropzone: t('dropzone.title'),
            dropzoneHint: t('dropzone.hint'),
            browse: t('dropzone.browse'),
            dragActive: t('dropzone.dragActive'),
            remove: t('dropzone.remove'),
            duration: t('dropzone.duration'),
            size: t('dropzone.size'),
          },
          form: {
            title: t('form.title'),
            titlePlaceholder: t('form.titlePlaceholder'),
            description: t('form.description'),
            descriptionPlaceholder: t('form.descriptionPlaceholder'),
            visibility: t('form.visibility'),
            visibilityPrivate: t('form.visibilityPrivate'),
            visibilityPrivateDesc: t('form.visibilityPrivateDesc'),
            visibilityUnlisted: t('form.visibilityUnlisted'),
            visibilityUnlistedDesc: t('form.visibilityUnlistedDesc'),
            visibilityPublic: t('form.visibilityPublic'),
            visibilityPublicDesc: t('form.visibilityPublicDesc'),
            upload: t('form.upload'),
            uploading: t('form.uploading'),
            availableDays: t('form.availableDays'),
            availableDaysHint: t('form.availableDaysHint'),
            module: t('form.module'),
            modulePlaceholder: t('form.modulePlaceholder'),
            unit: t('form.unit'),
            unitPlaceholder: t('form.unitPlaceholder'),
            lesson: t('form.lesson'),
            lessonPlaceholder: t('form.lessonPlaceholder'),
            optional: t('form.optional'),
          },
          progress: {
            preparing: t('progress.preparing'),
            uploading: t('progress.uploading'),
            processing: t('progress.processing'),
            complete: t('progress.complete'),
            error: t('progress.error'),
            cancel: t('progress.cancel'),
            retry: t('progress.retry'),
          },
        }}
      />
    </div>
  );
}
