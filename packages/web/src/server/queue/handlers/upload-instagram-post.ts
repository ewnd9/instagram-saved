import { PutObjectCommand } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import type { Job } from 'pg-boss';
import { injectable } from 'tsyringe';
import { env } from '~/env';
import { posts } from '~/server/db/schema';
import { DatabaseService } from '~/server/features/database/database-service';
import { parseInstagramPost } from '~/server/parsers/instagram-post';
import { S3Service } from '../../features/s3/s3-service';
import type { ParseInstagramPostPayload } from '../jobs';

@injectable()
export class UploadInstagramPostHandler {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly s3Service: S3Service,
  ) {}

  private extractPostIdFromUrl(url: string): string {
    const match = url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (!match || !match[1]) {
      throw new Error(`Could not extract post ID from URL: ${url}`);
    }
    return match[1];
  }

  async handle(jobs: Job[]): Promise<void> {
    const db = this.databaseService.db;

    for (const job of jobs) {
      console.log(`Parsing Instagram post job: ${job.id}`);

      try {
        const { url, collectionId, postId } = job.data as ParseInstagramPostPayload;

        console.log(`Parsing Instagram post: ${url} for collection ${collectionId}`);

        // Extract the shortcode from the URL
        const shortcode = this.extractPostIdFromUrl(url);

        // Parse the Instagram post using the new parser
        const instagramData = await parseInstagramPost({ postId: shortcode });
        console.log(`Extracted data for ${url}:`, instagramData);

        const [s3VideoUrl, s3ThumbnailSrc, s3DisplayUrl] = await Promise.all([
          this.uploadVideoToS3(instagramData.videoUrl, shortcode),
          this.uploadImageToS3(instagramData.thumbnailSrc, 'thumbnails', shortcode),
          this.uploadImageToS3(instagramData.displayUrl, 'display-image', shortcode),
        ]);

        if (postId) {
          await db
            .update(posts)
            .set({
              s3VideoUrl,
              s3ThumbnailSrc,
              s3DisplayUrl,
            })
            .where(eq(posts.id, postId));
        }

        console.log(`Successfully uploaded video ${url}`);
      } catch (error) {
        console.error(`Failed to parse Instagram post job ${job.id}:`, error);
        throw error; // This will cause the job to retry
      }
    }
  }

  async uploadVideoToS3(videoUrl: string, shortcode: string): Promise<string> {
    const response = await fetch(videoUrl);
    const videoBuffer = await response.arrayBuffer();

    const key = `instagram-saved/videos/${shortcode}.mp4`;
    await this.s3Service.s3Client.send(
      new PutObjectCommand({
        Bucket: env.AWS_BUCKET,
        Key: key,
        Body: Buffer.from(videoBuffer),
        ContentType: 'video/mp4',
      }),
    );

    return key;
  }

  async uploadImageToS3(thumbnailUrl: string, directory: string, shortcode: string): Promise<string> {
    const response = await fetch(thumbnailUrl);
    const thumbnailBuffer = await response.arrayBuffer();

    const key = `instagram-saved/${directory}/${shortcode}.jpg`;
    await this.s3Service.s3Client.send(
      new PutObjectCommand({
        Bucket: env.AWS_BUCKET,
        Key: key,
        Body: Buffer.from(thumbnailBuffer),
        ContentType: 'image/jpeg',
      }),
    );

    return key;
  }
}
