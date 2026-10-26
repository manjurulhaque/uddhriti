"use client";

interface GenerateQuoteCardOptions {
  content: string;
  authorName?: string | null;
  sourceTitle?: string | null;
  theme?: "cream" | "dark";
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${currentLine} ${word}`;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export async function generateQuoteCardBlob(
  options: GenerateQuoteCardOptions
): Promise<Blob> {
  const { content, authorName, sourceTitle, theme = "cream" } = options;

  const width = 1080;
  const height = 1080;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas 2D context");
  }

  const isDark = theme === "dark";

  // 1. Background
  if (isDark) {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#25292e");
    bgGrad.addColorStop(1, "#181a1d");
    ctx.fillStyle = bgGrad;
  } else {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#faf5ee");
    bgGrad.addColorStop(1, "#f2e7d7");
    ctx.fillStyle = bgGrad;
  }
  ctx.fillRect(0, 0, width, height);

  // 2. Decorative Double Border
  const pad = 48;
  ctx.lineWidth = 2;
  ctx.strokeStyle = isDark ? "rgba(233, 196, 106, 0.2)" : "rgba(199, 107, 62, 0.25)";
  ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

  ctx.lineWidth = 1;
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(33, 37, 41, 0.08)";
  ctx.strokeRect(pad + 12, pad + 12, width - (pad + 12) * 2, height - (pad + 12) * 2);

  // Corner Accent Marks
  const cornerSize = 16;
  ctx.fillStyle = isDark ? "#e9c46a" : "#c76b3e";
  ctx.fillRect(pad - 2, pad - 2, cornerSize, 3);
  ctx.fillRect(pad - 2, pad - 2, 3, cornerSize);
  ctx.fillRect(width - pad - cornerSize + 2, pad - 2, cornerSize, 3);
  ctx.fillRect(width - pad - 1, pad - 2, 3, cornerSize);
  ctx.fillRect(pad - 2, height - pad - 1, cornerSize, 3);
  ctx.fillRect(pad - 2, height - pad - cornerSize + 2, 3, cornerSize);
  ctx.fillRect(width - pad - cornerSize + 2, height - pad - 1, cornerSize, 3);
  ctx.fillRect(width - pad - 1, height - pad - cornerSize + 2, 3, cornerSize);

  // 3. Brand Header
  ctx.textAlign = "center";
  ctx.fillStyle = isDark ? "#e9c46a" : "#c76b3e";
  ctx.font = "600 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("✦  UDDHRITI  ✦", width / 2, pad + 60);

  // 4. Large Quotation Mark
  ctx.font = "italic 900 120px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = isDark ? "rgba(233, 196, 106, 0.3)" : "rgba(233, 196, 106, 0.55)";
  ctx.fillText("“", width / 2, pad + 180);

  // 5. Quote Text Wrapping with Adaptive Font Size
  let fontSize = 38;
  let lineHeight = 56;
  if (content.length > 280) {
    fontSize = 28;
    lineHeight = 44;
  } else if (content.length > 180) {
    fontSize = 32;
    lineHeight = 48;
  } else if (content.length < 80) {
    fontSize = 44;
    lineHeight = 64;
  }

  ctx.font = `italic 500 ${fontSize}px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = isDark ? "#ffffff" : "#212529";
  ctx.letterSpacing = "0px";

  const maxTextWidth = width - 240;
  const wrappedLines = wrapText(ctx, content, maxTextWidth);

  // Center vertical layout for quote text
  const totalTextHeight = wrappedLines.length * lineHeight;
  let startY = 320 + Math.max(0, (380 - totalTextHeight) / 2);

  for (const line of wrappedLines) {
    ctx.fillText(line, width / 2, startY);
    startY += lineHeight;
  }

  // 6. Divider Line
  const dividerY = Math.max(startY + 40, 760);
  ctx.lineWidth = 1;
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(33, 37, 41, 0.12)";
  ctx.beginPath();
  ctx.moveTo(width / 2 - 120, dividerY);
  ctx.lineTo(width / 2 + 120, dividerY);
  ctx.stroke();

  // 7. Author Attribution
  const author = (authorName || "Unknown").toUpperCase();
  ctx.font = "700 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillStyle = isDark ? "#f4c78b" : "#212529";
  ctx.fillText(author, width / 2, dividerY + 50);

  if (sourceTitle) {
    ctx.font = "italic 400 17px Georgia, serif";
    ctx.letterSpacing = "0.5px";
    ctx.fillStyle = isDark ? "#a1a1aa" : "#71717a";
    ctx.fillText(sourceTitle, width / 2, dividerY + 80);
  }

  // 8. Footer Watermark
  ctx.font = "500 13px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(33, 37, 41, 0.4)";
  ctx.fillText("TIMELESS QUOTES & IDEAS", width / 2, height - pad - 35);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas toBlob failed"));
        }
      },
      "image/png",
      1.0
    );
  });
}
