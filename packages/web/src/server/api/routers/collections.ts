import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { collections, posts } from "~/server/db/schema";
import { eq } from "drizzle-orm";

const postSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
});

const collectionSchema = z.object({
  user: z.string().min(1).max(30),
  name: z.string().min(1).max(255),
  id: z.string().regex(/^\d+$/),
  url: z.string().url(),
  posts: z.array(postSchema),
});

const savedCollectionsSchema = z.array(collectionSchema);

export const collectionsRouter = createTRPCRouter({
  importSavedCollections: publicProcedure
    .input(savedCollectionsSchema)
    .mutation(async ({ ctx, input }) => {
      const results = [];
      
      for (const collection of input) {
        try {
          // Insert or update collection
          await ctx.db
            .insert(collections)
            .values({
              id: collection.id,
              user: collection.user,
              name: collection.name,
              url: collection.url,
            })
            .onConflictDoUpdate({
              target: collections.id,
              set: {
                user: collection.user,
                name: collection.name,
                url: collection.url,
                updatedAt: new Date(),
              },
            });

          // Insert posts for this collection
          const postsToInsert = collection.posts.map((post) => ({
            id: post.id,
            url: post.url,
            collectionId: collection.id,
          }));

          if (postsToInsert.length > 0) {
            for (const post of postsToInsert) {
              await ctx.db
                .insert(posts)
                .values(post)
                .onConflictDoUpdate({
                  target: posts.id,
                  set: {
                    url: post.url,
                    collectionId: post.collectionId,
                    updatedAt: new Date(),
                  },
                });
            }
          }

          results.push({
            collectionId: collection.id,
            postsImported: collection.posts.length,
            success: true,
          });
        } catch (error) {
          results.push({
            collectionId: collection.id,
            error: error instanceof Error ? error.message : "Unknown error",
            success: false,
          });
        }
      }

      return {
        collectionsProcessed: input.length,
        results,
      };
    }),

  getAllCollections: publicProcedure.query(async ({ ctx }) => {
    const allCollections = await ctx.db.query.collections.findMany({
      orderBy: (collections, { desc }) => [desc(collections.updatedAt)],
      with: {
        posts: {
          orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        },
      },
    });

    return allCollections;
  }),

  getCollectionById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const collection = await ctx.db.query.collections.findFirst({
        where: eq(collections.id, input.id),
        with: {
          posts: {
            orderBy: (posts, { desc }) => [desc(posts.createdAt)],
          },
        },
      });

      return collection;
    }),

  getCollectionsByUser: publicProcedure
    .input(z.object({ user: z.string() }))
    .query(async ({ ctx, input }) => {
      const userCollections = await ctx.db.query.collections.findMany({
        where: eq(collections.user, input.user),
        orderBy: (collections, { desc }) => [desc(collections.updatedAt)],
        with: {
          posts: {
            orderBy: (posts, { desc }) => [desc(posts.createdAt)],
          },
        },
      });

      return userCollections;
    }),
});