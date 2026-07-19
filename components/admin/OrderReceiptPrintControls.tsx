"use client";

import Link from "next/link";

type OrderReceiptPrintControlsProps = {
  orderHref: string;
};

const buttonClass =
  "inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]";

const subtleButtonClass =
  "inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]";

export default function OrderReceiptPrintControls({
  orderHref,
}: OrderReceiptPrintControlsProps) {
  return (
    <div className="pos-receipt-no-print mb-6 flex flex-wrap items-start justify-between gap-4 border border-[#f7ead2]/10 bg-[#120d08] p-5">
      <div>
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#d8a344]">
          Receipt Print
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#e8dcc8]/62">
          For clean receipt output, use Paper size: Letter, Scale: 100%,
          Orientation: Portrait, Headers and footers: Off, and Double-sided:
          Off.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className={buttonClass}
        >
          Print Receipt
        </button>
        <Link href={orderHref} className={subtleButtonClass}>
          Back to Order
        </Link>
      </div>
    </div>
  );
}
