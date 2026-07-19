const code128Patterns = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
] as const;

const startCodeB = 104;
const stopCode = 106;

export type Code128Encoding = {
  value: string;
  checksum: number;
  codes: number[];
  modules: number;
};

export function normalizeCode128Value(value: string) {
  return value.trim();
}

export function isSupportedCode128Value(value: string) {
  const normalizedValue = normalizeCode128Value(value);

  return (
    normalizedValue.length > 0 &&
    Array.from(normalizedValue).every((character) => {
      const codePoint = character.charCodeAt(0);

      return codePoint >= 32 && codePoint <= 126;
    })
  );
}

export function isInternalProductBarcodeValue(value: string) {
  const normalizedValue = normalizeCode128Value(value);

  return (
    isSupportedCode128Value(normalizedValue) &&
    /^[A-Z0-9][A-Z0-9 -]{2,62}[A-Z0-9]$/.test(normalizedValue)
  );
}

export function assertSupportedCode128Value(value: string) {
  const normalizedValue = normalizeCode128Value(value);

  if (!isSupportedCode128Value(normalizedValue)) {
    throw new Error(
      "Code 128 value must use printable ASCII characters only.",
    );
  }

  return normalizedValue;
}

export function getCode128BValue(character: string) {
  const codePoint = character.charCodeAt(0);

  if (codePoint < 32 || codePoint > 126) {
    throw new Error("Unsupported Code 128 character.");
  }

  return codePoint - 32;
}

export function calculateCode128BChecksum(value: string) {
  const normalizedValue = assertSupportedCode128Value(value);
  const total = Array.from(normalizedValue).reduce(
    (checksum, character, index) =>
      checksum + getCode128BValue(character) * (index + 1),
    startCodeB,
  );

  return total % 103;
}

export function encodeCode128B(value: string): Code128Encoding {
  const normalizedValue = assertSupportedCode128Value(value);
  const characterCodes = Array.from(normalizedValue).map(getCode128BValue);
  const checksum = calculateCode128BChecksum(normalizedValue);
  const codes = [startCodeB, ...characterCodes, checksum, stopCode];
  const modules = codes.reduce((total, code) => {
    const pattern = code128Patterns[code];

    return (
      total +
      Array.from(pattern).reduce((patternTotal, width) => {
        return patternTotal + Number(width);
      }, 0)
    );
  }, 0);

  return {
    value: normalizedValue,
    checksum,
    codes,
    modules,
  };
}

export function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function renderCode128Svg(
  value: string,
  options: {
    barHeight?: number;
    moduleWidth?: number;
    quietZone?: number;
    showText?: boolean;
  } = {},
) {
  const encoding = encodeCode128B(value);
  const moduleWidth = options.moduleWidth ?? 2;
  const barHeight = options.barHeight ?? 84;
  const quietZone = options.quietZone ?? 16;
  const textHeight = options.showText === false ? 0 : 24;
  const width = encoding.modules * moduleWidth + quietZone * 2;
  const height = barHeight + textHeight;
  let cursor = quietZone;
  const bars: string[] = [];

  for (const code of encoding.codes) {
    const pattern = code128Patterns[code];

    Array.from(pattern).forEach((widthCharacter, index) => {
      const moduleCount = Number(widthCharacter);
      const segmentWidth = moduleCount * moduleWidth;

      if (index % 2 === 0) {
        bars.push(
          `<rect x="${cursor}" y="0" width="${segmentWidth}" height="${barHeight}" />`,
        );
      }

      cursor += segmentWidth;
    });
  }

  const text = options.showText === false
    ? ""
    : `<text x="${width / 2}" y="${barHeight + 17}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16">${escapeSvgText(encoding.value)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Code 128 barcode ${escapeSvgText(encoding.value)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ffffff" /><g fill="#000000">${bars.join("")}</g>${text}</svg>`;
}
