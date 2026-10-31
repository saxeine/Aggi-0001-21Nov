import { Crop } from "react-image-crop";

export async function getCroppedImg(
  imageSrc: string,
  percentCrop: Crop,
): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const cropX = (percentCrop.x * image.width) / 100;
  const cropY = (percentCrop.y * image.height) / 100;
  const cropWidth = (percentCrop.width * image.width) / 100;
  const cropHeight = (percentCrop.height * image.height) / 100;

  canvas.width = cropWidth;
  canvas.height = cropHeight;

  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return canvas.toDataURL("image/png");
}

export async function sliceImage(
  imageSrc: string,
  rowCuts: number[],
  colCuts: number[],
  format: "image/png" | "image/jpeg"
): Promise<{ url: string; name: string }[]> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const slices: { url: string; name: string }[] = [];
  
  const width = image.width;
  const height = image.height;

  // Add 0 and max dimensions to cuts
  const yPoints = [0, ...[...rowCuts].sort((a, b) => a - b), height];
  const xPoints = [0, ...[...colCuts].sort((a, b) => a - b), width];

  let sliceIndex = 0;

  for (let r = 0; r < yPoints.length - 1; r++) {
    for (let c = 0; c < xPoints.length - 1; c++) {
      const startX = xPoints[c];
      const startY = yPoints[r];
      const sliceWidth = xPoints[c + 1] - startX;
      const sliceHeight = yPoints[r + 1] - startY;

      if (sliceWidth <= 0 || sliceHeight <= 0) continue;

      canvas.width = sliceWidth;
      canvas.height = sliceHeight;

      ctx.clearRect(0, 0, sliceWidth, sliceHeight);
      ctx.drawImage(
        image,
        startX,
        startY,
        sliceWidth,
        sliceHeight,
        0,
        0,
        sliceWidth,
        sliceHeight
      );

      const ext = format === "image/png" ? "png" : "jpg";
      slices.push({
        url: canvas.toDataURL(format, 0.9),
        name: `slice-${r + 1}-${c + 1}.${ext}`,
      });
      sliceIndex++;
    }
  }

  return slices;
}
