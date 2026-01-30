# Integration Guide

This guide explains how to integrate the encoding service with your web application backend.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         YOUR WEB APP (Cloudflare)                        │
│                                                                          │
│  1. User uploads video ──▶ Upload to R2                                  │
│  2. Create job record in DB (status: "pending")                          │
│  3. Publish message to Pub/Sub ─────────────────────────┐                │
│                                                          │                │
│  6. Receive webhook ◀─────────────────────────────────┐  │                │
│  7. Update DB (status: "completed", paths, etc.)      │  │                │
└───────────────────────────────────────────────────────┼──┼────────────────┘
                                                        │  │
                                                        │  ▼
                                               ┌────────┴──────────┐
                                               │   Google Pub/Sub  │
                                               │   (encoding-jobs) │
                                               └────────┬──────────┘
                                                        │
                                                        ▼
                                               ┌───────────────────┐
                                               │  Cloud Run Job    │
                                               │  (enco-worker)    │
                                               │                   │
                                               │  4. Download from R2
                                               │  5. Encode + Upload│
                                               │  5. Send webhooks  │
                                               └───────────────────┘
```

---

## 1. GCP Setup (One-Time)

### Pub Sub Topic name : projects/quizy-474313/topics/video-encoding-jobs


## 2. Your Backend Setup

### A. Install Google Cloud Pub/Sub Client

```bash
# Node.js
npm install @google-cloud/pubsub

# Python
pip install google-cloud-pubsub
```

### B. Environment Variables

```env
# GCP
GOOGLE_APPLICATION_CREDENTIALS=/path/to/pubsub-key.json
GCP_PROJECT_ID=your-gcp-project
PUBSUB_TOPIC=encoding-jobs

# Webhook secret (generate a strong random string)
ENCODING_WEBHOOK_SECRET=your-secret-key-min-32-chars

# R2 bucket name
R2_BUCKET=your-bucket-name
```

---

## 3. Message Format

When a user uploads a video, publish this message to Pub/Sub:

### TypeScript Interface

```typescript
interface EncodingJobMessage {
  jobId: string;           // Unique ID you generate (e.g., "job_abc123")
  videoId: string;         // Your video record ID (e.g., "vid_xyz789")

  source: {
    bucket: string;        // "your-r2-bucket"
    path: string;          // "videos/raw" (folder path, no trailing slash)
    filename: string;      // "original.mp4"
  };

  output: {
    bucket: string;        // Same bucket usually
    basePath: string;      // "videos" (base path for outputs)
  };

  qualities: Array<{
    quality: "1080p" | "720p" | "480p" | "360p" | "280p";
    width: number;
    height: number;
    bitrate: number;       // Video bitrate in kbps
    audioBitrate: number;  // Audio bitrate in kbps
  }>;

  thumbnail: {
    enabled: boolean;
    timestampPercent: number;  // 0-100, e.g., 25 = 25% into video
    path: string;
  };

  audioForStt: {
    enabled: boolean;      // Set true to extract audio for transcription
  };

  callback: {
    webhookUrl: string;    // "https://your-app.com/api/webhooks/encoding" (must be HTTPS)
    webhookSecret: string; // Min 32 characters, same as ENCODING_WEBHOOK_SECRET
  };

  metadata: {
    userId: string;
    title?: string;
    createdAt: string;     // ISO timestamp
  };
}
```

### Example Message

```json
{
  "jobId": "job_abc123def456",
  "videoId": "vid_xyz789",
  "source": {
    "bucket": "quizat-files",
    "path": "videos/raw/vid_xyz789",
    "filename": "lecture.mp4"
  },
  "output": {
    "bucket": "quizat-files",
    "basePath": "videos"
  },
  "qualities": [
    {"quality": "1080p", "width": 1920, "height": 1080, "bitrate": 3500, "audioBitrate": 128},
    {"quality": "720p", "width": 1280, "height": 720, "bitrate": 1800, "audioBitrate": 128},
    {"quality": "480p", "width": 854, "height": 480, "bitrate": 900, "audioBitrate": 96}
  ],
  "thumbnail": {
    "enabled": true,
    "timestampPercent": 25,
    "path": "videos/thumbnails"
  },
  "audioForStt": {
    "enabled": true
  },
  "callback": {
    "webhookUrl": "https://api.quizat.eg/webhooks/encoding",
    "webhookSecret": "whsec_your_secret_key_min_32_chars_long"
  },
  "metadata": {
    "userId": "user_123",
    "title": "Introduction to Physics",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### Input Validation Requirements

The encoding service enforces strict validation on all inputs to prevent security vulnerabilities:

| Field | Requirements |
|-------|--------------|
| `jobId` | Alphanumeric, hyphens, underscores only. Max 128 characters. |
| `videoId` | Alphanumeric, hyphens, underscores only. Max 128 characters. |
| `source.filename` | Cannot contain `/`, `\`, or `..` sequences. |
| `source.path` | Cannot start with `/` or contain `..` sequences. |
| `output.basePath` | Cannot start with `/` or contain `..` sequences. |
| `callback.webhookUrl` | Must be HTTPS. Cannot resolve to private/internal IPs (10.x, 172.16-31.x, 192.168.x, 169.254.x, localhost). |
| `callback.webhookSecret` | Minimum 32 characters required. |

**Example valid IDs:**
- `job_abc123def456`
- `vid-xyz-789`
- `video_2024_01_15_lecture`

**Example invalid IDs (will be rejected):**
- `../../../etc/passwd` (path traversal)
- `job/123` (contains path separator)
- `` (empty)

---

## 4. Publishing to Pub/Sub

### Node.js/TypeScript Example

```typescript
import { PubSub } from '@google-cloud/pubsub';
import crypto from 'crypto';

const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
const topic = pubsub.topic(process.env.PUBSUB_TOPIC);

export async function triggerEncodingJob(params: {
  videoId: string;
  userId: string;
  sourceFilename: string;
  title?: string;
}): Promise<string> {
  const jobId = `job_${crypto.randomUUID()}`;

  const message: EncodingJobMessage = {
    jobId,
    videoId: params.videoId,
    source: {
      bucket: process.env.R2_BUCKET!,
      path: `videos/raw/${params.videoId}`,
      filename: params.sourceFilename,
    },
    output: {
      bucket: process.env.R2_BUCKET!,
      basePath: 'videos',
    },
    qualities: [
      { quality: '1080p', width: 1920, height: 1080, bitrate: 3500, audioBitrate: 128 },
      { quality: '720p', width: 1280, height: 720, bitrate: 1800, audioBitrate: 128 },
      { quality: '480p', width: 854, height: 480, bitrate: 900, audioBitrate: 96 },
    ],
    thumbnail: {
      enabled: true,
      timestampPercent: 25,
      path: 'videos/thumbnails',
    },
    audioForStt: {
      enabled: true,
    },
    callback: {
      webhookUrl: `${process.env.APP_URL}/api/webhooks/encoding`,
      webhookSecret: process.env.ENCODING_WEBHOOK_SECRET!,
    },
    metadata: {
      userId: params.userId,
      title: params.title,
      createdAt: new Date().toISOString(),
    },
  };

  // Publish to Pub/Sub
  const messageId = await topic.publishMessage({
    data: Buffer.from(JSON.stringify(message)),
  });

  console.log(`Published encoding job ${jobId}, messageId: ${messageId}`);

  // Save job to your database
  await db.encodingJobs.create({
    id: jobId,
    videoId: params.videoId,
    status: 'pending',
    createdAt: new Date(),
  });

  return jobId;
}
```

### Python Example

```python
from google.cloud import pubsub_v1
import json
import uuid
from datetime import datetime

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, "encoding-jobs")

def trigger_encoding_job(video_id: str, user_id: str, source_filename: str, title: str = None) -> str:
    job_id = f"job_{uuid.uuid4()}"

    message = {
        "jobId": job_id,
        "videoId": video_id,
        "source": {
            "bucket": R2_BUCKET,
            "path": f"videos/raw/{video_id}",
            "filename": source_filename,
        },
        "output": {
            "bucket": R2_BUCKET,
            "basePath": "videos",
        },
        "qualities": [
            {"quality": "1080p", "width": 1920, "height": 1080, "bitrate": 3500, "audioBitrate": 128},
            {"quality": "720p", "width": 1280, "height": 720, "bitrate": 1800, "audioBitrate": 128},
            {"quality": "480p", "width": 854, "height": 480, "bitrate": 900, "audioBitrate": 96},
        ],
        "thumbnail": {
            "enabled": True,
            "timestampPercent": 25,
            "path": "videos/thumbnails",
        },
        "audioForStt": {
            "enabled": True,
        },
        "callback": {
            "webhookUrl": f"{APP_URL}/api/webhooks/encoding",
            "webhookSecret": ENCODING_WEBHOOK_SECRET,
        },
        "metadata": {
            "userId": user_id,
            "title": title,
            "createdAt": datetime.utcnow().isoformat() + "Z",
        },
    }

    # Publish to Pub/Sub
    future = publisher.publish(topic_path, json.dumps(message).encode("utf-8"))
    message_id = future.result()

    print(f"Published encoding job {job_id}, messageId: {message_id}")
    return job_id
```

---

## 5. Webhook Events

The encoder sends webhooks to your `callback.webhookUrl`.

### Event Types

| Event | When | What It Contains |
|-------|------|------------------|
| `job.started` | After source analysis | Source dimensions, duration, quality count |
| `job.progress` | During encoding | Progress %, current quality, stage |
| `quality.completed` | Each quality done | R2 path, file size |
| `thumbnail.generated` | Thumbnail ready | R2 path, file size |
| `audio.extracted` | STT audio ready | R2 path, file size, duration, format specs |
| `job.completed` | All done | All qualities, thumbnail, audio info |
| `job.failed` | On error | Error code, message, details |

### Webhook Signature Verification

All webhooks include a signature header for security:

```
X-Webhook-Signature: t=1234567890,v1=abc123def456...
```

The signature is computed as:
```
HMAC-SHA256(webhookSecret, "<timestamp>.<json_body>")
```

### Webhook Handler (Node.js/Express)

```typescript
import crypto from 'crypto';
import express from 'express';

const router = express.Router();

// Verify webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  // Signature format: t=<timestamp>,v1=<hmac>
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const hash = parts.find(p => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !hash) return false;

  // Verify timestamp is recent (within 5 minutes)
  const age = Date.now() / 1000 - parseInt(timestamp);
  if (age > 300) return false;

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
}

router.post('/api/webhooks/encoding', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const payload = req.body.toString();

  // Verify signature
  if (!verifySignature(payload, signature, process.env.ENCODING_WEBHOOK_SECRET!)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(payload);
  console.log(`Received ${event.event} for job ${event.jobId}`);

  switch (event.event) {
    case 'job.started':
      await db.videos.update({
        where: { id: event.videoId },
        data: {
          status: 'encoding',
          sourceWidth: event.data.sourceWidth,
          sourceHeight: event.data.sourceHeight,
          duration: event.data.sourceDuration,
        },
      });
      break;

    case 'job.progress':
      // Optional: update progress for UI
      await db.encodingJobs.update({
        where: { id: event.jobId },
        data: { progress: event.data.progress },
      });
      break;

    case 'quality.completed':
      // Track each quality as it completes
      await db.videoQualities.create({
        data: {
          videoId: event.videoId,
          quality: event.data.quality,
          path: event.data.outputPath,
          fileSize: event.data.fileSizeBytes,
        },
      });
      break;

    case 'audio.extracted':
      // STT audio is ready - you can now trigger transcription
      await db.videos.update({
        where: { id: event.videoId },
        data: {
          sttAudioPath: event.data.outputPath,
          sttAudioSize: event.data.fileSizeBytes,
        },
      });
      // Optionally trigger transcription job here
      // await triggerTranscriptionJob(event.videoId, event.data.outputPath);
      break;

    case 'job.completed':
      await db.videos.update({
        where: { id: event.videoId },
        data: {
          status: 'ready',
          encodedAt: new Date(),
          thumbnailPath: event.data.thumbnail?.outputPath,
          audioPath: event.data.audio?.outputPath,
        },
      });
      await db.encodingJobs.update({
        where: { id: event.jobId },
        data: { status: 'completed', completedAt: new Date() },
      });
      break;

    case 'job.failed':
      await db.videos.update({
        where: { id: event.videoId },
        data: { status: 'failed' },
      });
      await db.encodingJobs.update({
        where: { id: event.jobId },
        data: {
          status: 'failed',
          errorCode: event.data.errorCode,
          errorMessage: event.data.errorMessage,
        },
      });
      // Alert/notify about failure
      break;
  }

  res.status(200).json({ received: true });
});

export default router;
```

### Webhook Handler (Python/FastAPI)

```python
import hmac
import hashlib
import time
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    parts = dict(p.split('=', 1) for p in signature.split(','))
    timestamp = parts.get('t')
    received_hash = parts.get('v1')

    if not timestamp or not received_hash:
        return False

    # Check timestamp is recent (within 5 minutes)
    if time.time() - int(timestamp) > 300:
        return False

    # Compute expected signature
    signed_payload = f"{timestamp}.{payload.decode()}"
    expected = hmac.new(
        secret.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(received_hash, expected)

@app.post("/api/webhooks/encoding")
async def encoding_webhook(request: Request):
    signature = request.headers.get("x-webhook-signature", "")
    payload = await request.body()

    if not verify_signature(payload, signature, ENCODING_WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = await request.json()
    event_type = event["event"]
    job_id = event["jobId"]
    video_id = event["videoId"]

    if event_type == "job.started":
        await update_video(video_id, status="encoding")

    elif event_type == "job.completed":
        await update_video(
            video_id,
            status="ready",
            thumbnail_path=event["data"].get("thumbnail", {}).get("outputPath"),
            audio_path=event["data"].get("audio", {}).get("outputPath"),
        )

    elif event_type == "job.failed":
        await update_video(video_id, status="failed")
        await log_error(job_id, event["data"])

    return {"received": True}
```

---

## 6. Webhook Event Payloads

### job.started

```json
{
  "event": "job.started",
  "jobId": "job_abc123",
  "videoId": "vid_xyz789",
  "timestamp": "2024-01-15T10:00:05Z",
  "data": {
    "sourceWidth": 1920,
    "sourceHeight": 1080,
    "sourceDuration": 3600.5,
    "qualityCount": 3
  }
}
```

### job.progress

```json
{
  "event": "job.progress",
  "jobId": "job_abc123",
  "videoId": "vid_xyz789",
  "timestamp": "2024-01-15T10:05:00Z",
  "data": {
    "progress": 45.5,
    "stage": "encoding",
    "currentQuality": "720p"
  }
}
```

### quality.completed

```json
{
  "event": "quality.completed",
  "jobId": "job_abc123",
  "videoId": "vid_xyz789",
  "timestamp": "2024-01-15T10:10:00Z",
  "data": {
    "quality": "1080p",
    "outputPath": "videos/encoded/vid_xyz789/1080p.mp4",
    "fileSizeBytes": 524288000
  }
}
```

### audio.extracted

```json
{
  "event": "audio.extracted",
  "jobId": "job_abc123",
  "videoId": "vid_xyz789",
  "timestamp": "2024-01-15T10:15:00Z",
  "data": {
    "outputPath": "videos/audio/vid_xyz789/audio_for_stt.wav",
    "fileSizeBytes": 115200000,
    "durationSeconds": 3600.5,
    "format": "wav",
    "sampleRate": 16000,
    "channels": 1,
    "bitDepth": 16
  }
}
```

### job.completed

```json
{
  "event": "job.completed",
  "jobId": "job_abc123",
  "videoId": "vid_xyz789",
  "timestamp": "2024-01-15T10:20:00Z",
  "data": {
    "qualities": [
      {"quality": "1080p", "outputPath": "videos/encoded/vid_xyz789/1080p.mp4", "fileSizeBytes": 524288000},
      {"quality": "720p", "outputPath": "videos/encoded/vid_xyz789/720p.mp4", "fileSizeBytes": 262144000},
      {"quality": "480p", "outputPath": "videos/encoded/vid_xyz789/480p.mp4", "fileSizeBytes": 104857600}
    ],
    "thumbnail": {
      "outputPath": "videos/thumbnails/vid_xyz789.jpg",
      "fileSizeBytes": 102400
    },
    "audio": {
      "outputPath": "videos/audio/vid_xyz789/audio_for_stt.wav",
      "fileSizeBytes": 115200000,
      "durationSeconds": 3600.5
    },
    "totalDurationSeconds": 1200.5
  }
}
```

### job.failed

```json
{
  "event": "job.failed",
  "jobId": "job_abc123",
  "videoId": "vid_xyz789",
  "timestamp": "2024-01-15T10:05:00Z",
  "data": {
    "errorCode": "ENCODING_FAILED",
    "errorMessage": "FFmpeg encoding failed for 1080p",
    "errorDetails": "Exit code 1: ..."
  }
}
```

---

## 7. Output Paths in R2

After encoding completes, files are stored at:

```
your-bucket/
├── videos/
│   ├── raw/{videoId}/
│   │   └── original.mp4              # Your upload (input)
│   ├── encoded/{videoId}/
│   │   ├── 1080p.mp4                 # Encoded qualities
│   │   ├── 720p.mp4
│   │   └── 480p.mp4
│   ├── thumbnails/
│   │   └── {videoId}.jpg             # Thumbnail
│   └── audio/{videoId}/
│       └── audio_for_stt.wav         # STT audio (16kHz mono WAV)
```

---

## 8. STT Audio Specifications

When `audioForStt.enabled` is `true`, the encoder extracts audio optimized for speech-to-text:

| Property | Value | Reason |
|----------|-------|--------|
| Format | WAV | No compression artifacts |
| Codec | PCM (pcm_s16le) | Uncompressed, maximum accuracy |
| Sample Rate | 16,000 Hz | Optimal for speech recognition |
| Channels | Mono | STT engines process single channel |
| Bit Depth | 16-bit | Sufficient for speech |
| Normalization | EBU R128 (-16 LUFS) | Consistent audio levels |

**File size**: ~115 MB per hour of audio

This format is compatible with all major STT providers:
- Google Cloud Speech-to-Text
- OpenAI Whisper
- Azure Speech Services
- AWS Transcribe
- AssemblyAI

---

## 9. Complete Flow Summary

1. **User uploads video** → Your backend stores in R2 at `videos/raw/{videoId}/filename.mp4`
2. **Create DB record** → Video status = "pending"
3. **Publish to Pub/Sub** → Send the encoding job message
4. **Cloud Run Job starts** → Triggered automatically by Eventarc
5. **Receive `job.started` webhook** → Update status to "encoding"
6. **Receive `job.progress` webhooks** → Update progress bar (optional)
7. **Receive `quality.completed` webhooks** → Track each quality
8. **Receive `audio.extracted` webhook** → STT audio ready, trigger transcription
9. **Receive `job.completed` webhook** → Update status to "ready", store all paths
10. **Video ready for playback** → Serve from R2 via Cloudflare CDN

---

## 10. Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `INVALID_MESSAGE` | Malformed input message | No |
| `INVALID_JOB_ID` | Missing or invalid job/video ID | No |
| `INVALID_SOURCE` | Missing source configuration | No |
| `INVALID_QUALITIES` | No valid qualities specified | No |
| `INVALID_CALLBACK` | Missing webhook configuration | No |
| `SOURCE_NOT_FOUND` | Source video doesn't exist in R2 | No |
| `SOURCE_DOWNLOAD_FAILED` | Failed to download source | Yes |
| `UPLOAD_FAILED` | Failed to upload encoded file | Yes |
| `STORAGE_ACCESS_DENIED` | R2 permission error | Yes |
| `FFMPEG_NOT_FOUND` | FFmpeg not installed | No |
| `PROBE_FAILED` | Failed to analyze source video | Yes |
| `ENCODING_FAILED` | FFmpeg encoding error | Yes |
| `THUMBNAIL_FAILED` | Thumbnail generation error | N/A (non-fatal) |
| `AUDIO_EXTRACTION_FAILED` | Audio extraction error | N/A (non-fatal) |
| `UNSUPPORTED_CODEC` | Source codec not supported | No |
| `DISK_FULL` | Insufficient disk space | Yes |
| `TIMEOUT` | Operation timed out | Yes |

---

## 11. Recommended Database Schema

```sql
-- Videos table
CREATE TABLE videos (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending', -- pending, encoding, ready, failed

  -- Source info (after job.started)
  source_width INT,
  source_height INT,
  duration DECIMAL(10,2),

  -- Output paths (after job.completed)
  thumbnail_path VARCHAR(500),
  stt_audio_path VARCHAR(500),

  created_at TIMESTAMP DEFAULT NOW(),
  encoded_at TIMESTAMP
);

-- Video qualities table
CREATE TABLE video_qualities (
  id SERIAL PRIMARY KEY,
  video_id VARCHAR(50) REFERENCES videos(id),
  quality VARCHAR(10), -- 1080p, 720p, 480p
  path VARCHAR(500),
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Encoding jobs table (for tracking)
CREATE TABLE encoding_jobs (
  id VARCHAR(50) PRIMARY KEY,
  video_id VARCHAR(50) REFERENCES videos(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  progress DECIMAL(5,2) DEFAULT 0,
  error_code VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```
