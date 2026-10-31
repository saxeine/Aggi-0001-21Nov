/**
 * A single colour-segmented component of the source image.
 * Every layer is a full-size transparent PNG containing only the pixels that
 * belong to one cluster, so stacking all layers reconstructs the original.
 */
export interface ImageLayer {
  id: string;
  name: string;
  dataUrl: string;
  /** Mean colour of the cluster as [r, g, b] in 0-255. */
  color: [number, number, number];
  colorHex: string;
  /** Share of the image covered by this cluster, 0-100. */
  percentage: number;
  visible: boolean;
}

export type ViewMode = 'layers' | 'explode' | 'grid' | 'original' | 'compare';
