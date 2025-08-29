import { eq } from 'drizzle-orm';
import type { Job } from 'pg-boss';
import { injectable } from 'tsyringe';
import { posts, profiles } from '~/server/db/schema';
import { DatabaseService } from '~/server/features/database/database-service';
import { parseInstagramPost } from '~/server/parsers/instagram-post';
import type { ParseInstagramPostPayload } from '../jobs';

@injectable()
export class ParseInstagramPostHandler {
  constructor(private readonly databaseService: DatabaseService) {}

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

        // Create or update profile if we have profile data
        let profileDbId = null;
        if (instagramData.owner?.id && instagramData.owner?.username) {
          const existingProfile = await db
            .select()
            .from(profiles)
            .where(eq(profiles.id, instagramData.owner.id))
            .limit(1);

          if (existingProfile.length > 0) {
            // Update existing profile
            await db
              .update(profiles)
              .set({
                username: instagramData.owner.username,
                displayName: instagramData.owner.fullName,
                profileUrl: `https://instagram.com/${instagramData.owner.username}`,
                updatedAt: new Date(),
              })
              .where(eq(profiles.id, instagramData.owner.id));
            profileDbId = instagramData.owner.id;
          } else {
            // Create new profile
            await db.insert(profiles).values({
              id: instagramData.owner.id,
              username: instagramData.owner.username,
              displayName: instagramData.owner.fullName,
              profileUrl: `https://instagram.com/${instagramData.owner.username}`,
            });
            profileDbId = instagramData.owner.id;
          }
        }

        // Update the post in the database with extracted information
        if (postId) {
          await db
            .update(posts)
            .set({
              profileId: profileDbId,
              shortcode,
              description: instagramData.description,
              videoUrl: instagramData.videoUrl,
              thumbnailSrc: instagramData.thumbnailSrc,
              displayUrl: instagramData.displayUrl,
              parsedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(posts.id, postId));
        }

        console.log(`Successfully parsed and updated post ${url}`);
      } catch (error) {
        console.error(`Failed to parse Instagram post job ${job.id}:`, error);
        throw error; // This will cause the job to retry
      }
    }
  }
}
