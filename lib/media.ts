import fs from "node:fs";
import path from "node:path";

const productMediaRoot = path.join(process.cwd(), "public", "products");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export type MediaImage = {
  id: string;
  filename: string;
  relativePath: string;
  category: string;
  folder: string;
  extension: string;
  url: string;
  dimensions?: {
    width: number;
    height: number;
  };
};

function walkDirectory(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkDirectory(fullPath);
    }

    return [fullPath];
  });
}

function getPngDimensions(buffer: Buffer) {
  if (
    buffer.length < 24 ||
    buffer.toString("ascii", 1, 4) !== "PNG" ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return undefined;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getJpegDimensions(buffer: Buffer) {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      return undefined;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return undefined;
}

function getWebpDimensions(buffer: Buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return undefined;
  }

  const format = buffer.toString("ascii", 12, 16);

  if (format === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (format === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (format === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);

    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  return undefined;
}

function getImageDimensions(filePath: string, extension: string) {
  const buffer = fs.readFileSync(filePath);

  if (extension === "png") {
    return getPngDimensions(buffer);
  }

  if (extension === "jpg" || extension === "jpeg") {
    return getJpegDimensions(buffer);
  }

  if (extension === "webp") {
    return getWebpDimensions(buffer);
  }

  return undefined;
}

function toDisplayName(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getProductMedia(): MediaImage[] {
  return walkDirectory(productMediaRoot)
    .filter((filePath) => supportedExtensions.has(path.extname(filePath).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((filePath) => {
      const relativeFromPublic = path.relative(
        path.join(process.cwd(), "public"),
        filePath,
      );
      const relativeFromProducts = path.relative(productMediaRoot, filePath);
      const extension = path.extname(filePath).slice(1).toLowerCase();
      const folder = path.dirname(relativeFromProducts).replaceAll(path.sep, "/");
      const [categorySegment = "uncategorized"] = folder.split("/");
      const url = `/${relativeFromPublic.replaceAll(path.sep, "/")}`;

      return {
        id: relativeFromProducts.replaceAll(path.sep, "-").toLowerCase(),
        filename: path.basename(filePath),
        relativePath: relativeFromPublic.replaceAll(path.sep, "/"),
        category: toDisplayName(categorySegment),
        folder,
        extension,
        url,
        dimensions: getImageDimensions(filePath, extension),
      };
    });
}
