import { calculateCode128BChecksum, encodeCode128B } from "@/lib/barcodes/code128";

export const code128TestCases = [
  {
    value: "A",
    checksum: 34,
    codes: [104, 33, 34, 106],
  },
  {
    value: "ASHE",
    checksum: 95,
    codes: [104, 33, 51, 40, 37, 95, 106],
  },
  {
    value: "123456",
    checksum: 16,
    codes: [104, 17, 18, 19, 20, 21, 22, 16, 106],
  },
  {
    value: "AT-P-00000001",
    checksum: 15,
    codes: [
      104,
      33,
      52,
      13,
      48,
      13,
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      17,
      15,
      106,
    ],
  },
] as const;

export function verifyCode128TestCases() {
  return code128TestCases.every((testCase) => {
    const encoding = encodeCode128B(testCase.value);

    return (
      calculateCode128BChecksum(testCase.value) === testCase.checksum &&
      encoding.checksum === testCase.checksum &&
      encoding.codes.length === testCase.codes.length &&
      encoding.codes.every((code, index) => code === testCase.codes[index])
    );
  });
}
