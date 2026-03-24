import { createClient } from '../../supabase-server';
import type { CogImage, CogImageWithGroupInfo } from '../../types/cog';

/**
 * Get group primary images (one per group) with group counts for a series - server-side
 * Returns one image per group, ordered by creation date.
 *
 * If primaryImageId is provided and exists in a group, that image will be shown
 * as the cover for that group instead of the default group primary.
 */
export async function getGroupPrimaryImagesServer(
  seriesId: string,
  primaryImageId?: string | null
): Promise<CogImageWithGroupInfo[]> {
  const client = await createClient();

  // Get all images for the series
  const { data: allImages, error: imagesError } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('series_id', seriesId);

  if (imagesError) throw imagesError;
  if (!allImages || allImages.length === 0) return [];

  // Count images per group and track group primaries
  const groupCountMap = new Map<string, number>();
  const groupPrimaryMap = new Map<string, CogImage>(); // group_id -> default group primary
  let seriesPrimaryGroupId: string | null = null;
  let seriesPrimaryImage: CogImage | null = null;

  for (const img of allImages) {
    const groupId = img.group_id || img.id;

    // Count images per group
    const count = groupCountMap.get(groupId) || 0;
    groupCountMap.set(groupId, count + 1);

    // Track default group primaries (id === group_id)
    const isGroupPrimary = img.id === groupId || (!img.group_id && !img.parent_image_id);
    if (isGroupPrimary && !groupPrimaryMap.has(groupId)) {
      groupPrimaryMap.set(groupId, img);
    }

    // Track if series primary is in this group
    if (primaryImageId && img.id === primaryImageId) {
      seriesPrimaryGroupId = groupId;
      seriesPrimaryImage = img;
    }
  }

  // Build the list of representative images (one per group)
  const representatives: CogImageWithGroupInfo[] = [];

  for (const [groupId, defaultPrimary] of groupPrimaryMap) {
    // If series primary is in this group, use it instead of default primary
    const representativeImage =
      seriesPrimaryGroupId === groupId && seriesPrimaryImage
        ? seriesPrimaryImage
        : defaultPrimary;

    representatives.push({
      ...representativeImage,
      group_count: groupCountMap.get(groupId) || 1,
    });
  }

  // Sort by creation date (newest first)
  representatives.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return representatives;
}

/**
 * Get all images in the same group - server-side
 * Returns images in the group ordered by group_position (if set), then by created_at
 */
export async function getImageGroupServer(imageId: string): Promise<CogImage[]> {
  const client = await createClient();

  // First get the image to find its group_id
  const { data: image, error: imageError } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (imageError) throw imageError;

  const groupId = image.group_id || image.id;

  // Get all images in this group
  const { data: groupImages, error: groupError } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('group_id', groupId);

  if (groupError) throw groupError;

  // If no images found with group_id, fallback to legacy parent chain
  if (!groupImages || groupImages.length === 0) {
    return await getImageVersionChainServerLegacy(imageId, image);
  }

  // Sort by group_position (if set), then by created_at
  const sorted = (groupImages as CogImage[]).sort((a, b) => {
    // If both have positions, sort by position
    if (a.group_position !== null && b.group_position !== null) {
      return a.group_position - b.group_position;
    }
    // If only a has position, a comes first
    if (a.group_position !== null) return -1;
    // If only b has position, b comes first
    if (b.group_position !== null) return 1;
    // Neither has position, sort by created_at
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return sorted;
}

/**
 * Legacy: Get the full version chain for an image using parent_image_id
 * Used as fallback for images created before group_id migration
 */
async function getImageVersionChainServerLegacy(imageId: string, image: CogImage): Promise<CogImage[]> {
  const client = await createClient();

  // Get all images in this series to build the chain
  const { data: allImages, error: allError } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('series_id', image.series_id);

  if (allError) throw allError;

  // Build parent lookup
  const imageMap = new Map<string, CogImage>();
  const childrenMap = new Map<string, CogImage[]>();

  for (const img of allImages) {
    imageMap.set(img.id, img);
    if (img.parent_image_id) {
      const children = childrenMap.get(img.parent_image_id) || [];
      children.push(img);
      childrenMap.set(img.parent_image_id, children);
    }
  }

  // Find the root of the chain containing this image
  let root = image;
  while (root.parent_image_id) {
    const parent = imageMap.get(root.parent_image_id);
    if (!parent) break;
    root = parent;
  }

  // Build chain from root following creation time
  const chain: CogImage[] = [root];
  let current = root;
  while (true) {
    const children = childrenMap.get(current.id) || [];
    if (children.length === 0) break;
    const latestChild = children.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    chain.push(latestChild);
    current = latestChild;
  }

  return chain;
}

// Legacy aliases for backwards compatibility
export const getRootImagesWithVersionCountsServer = getGroupPrimaryImagesServer;
export const getImageVersionChainServer = getImageGroupServer;
