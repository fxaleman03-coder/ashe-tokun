import type { Language } from "@/lib/translations";

type LocalizedText = Record<Language, string>;

export type Product = {
  id: string;
  slug: string;
  name: LocalizedText;
  category: LocalizedText;
  tradition: LocalizedText;
  price: number;
  compareAtPrice?: number;
  image: string | null;
  inStock: boolean;
  isFeatured: boolean;
  isNew: boolean;
  shortDescription: LocalizedText;
};

export const products: Product[] = [
  {
    id: "prod-opon-ifa-classic",
    slug: "classic-opon-ifa-board",
    name: {
      en: "Classic Opon Ifá Board",
      es: "Tablero Opon Ifá Clásico",
      yo: "Pátákó Opon Ifá",
    },
    category: {
      en: "Tools",
      es: "Herramientas",
      yo: "Ohun Èlò",
    },
    tradition: {
      en: "Ifá",
      es: "Ifá",
      yo: "Ifá",
    },
    price: 185,
    compareAtPrice: 225,
    image: null,
    inStock: true,
    isFeatured: true,
    isNew: true,
    shortDescription: {
      en: "A refined ceremonial board selected for study, guidance, and reverent practice.",
      es: "Un tablero ceremonial refinado para estudio, guía y práctica con respeto.",
      yo: "Ohun èlò ayẹyẹ fún ẹ̀kọ́, ìtọ́sọ́nà, àti ìṣe pẹ̀lú ọ̀wọ̀.",
    },
  },
  {
    id: "prod-eleke-oshun-gold",
    slug: "oshun-gold-eleke",
    name: {
      en: "Oshun Gold Eleke",
      es: "Eleké Dorado de Oshun",
      yo: "Eleké Wúrà Oshun",
    },
    category: {
      en: "Ide",
      es: "Ide",
      yo: "Ide",
    },
    tradition: {
      en: "Òrìṣà",
      es: "Òrìṣà",
      yo: "Òrìṣà",
    },
    price: 68,
    image: null,
    inStock: true,
    isFeatured: true,
    isNew: false,
    shortDescription: {
      en: "A luminous devotional strand with warm gold tones and elegant ceremonial presence.",
      es: "Una pieza devocional luminosa con tonos dorados y presencia ceremonial elegante.",
      yo: "Eleké rírẹwà pẹ̀lú àwọ̀ wúrà fún ìbòwọ̀ àti ìṣe àṣà.",
    },
  },
  {
    id: "prod-ritual-candle-set",
    slug: "ritual-candle-set",
    name: {
      en: "Ritual Candle Set",
      es: "Set de Velas Rituales",
      yo: "Àkójọpọ̀ Kándù Ayẹyẹ",
    },
    category: {
      en: "Candles",
      es: "Velas",
      yo: "Kándù",
    },
    tradition: {
      en: "Spiritual Supplies",
      es: "Suministros Espirituales",
      yo: "Ohun Èlò Ẹ̀mí",
    },
    price: 42,
    image: null,
    inStock: false,
    isFeatured: true,
    isNew: false,
    shortDescription: {
      en: "A premium candle collection prepared for focused intention and daily devotion.",
      es: "Una colección premium de velas para intención enfocada y devoción diaria.",
      yo: "Àwọn kándù fún èrò rere, ìmúra, àti ìṣe ojoojúmọ́.",
    },
  },
  {
    id: "prod-devotional-medallion",
    slug: "gold-devotional-medallion",
    name: {
      en: "Gold Devotional Medallion",
      es: "Medallón Devocional Dorado",
      yo: "Medallion Ìbòwọ̀ Wúrà",
    },
    category: {
      en: "Jewelry",
      es: "Joyería",
      yo: "Ọ̀ṣọ́",
    },
    tradition: {
      en: "Devotional Articles",
      es: "Artículos Devocionales",
      yo: "Nkan Ìbòwọ̀",
    },
    price: 96,
    compareAtPrice: 125,
    image: null,
    inStock: true,
    isFeatured: true,
    isNew: true,
    shortDescription: {
      en: "An elegant keepsake for reverence, protection, and meaningful daily wear.",
      es: "Una pieza elegante para reverencia, protección y uso diario con significado.",
      yo: "Ohun ọ̀ṣọ́ rírẹwà fún ìbòwọ̀, ìtọ́jú, àti lílò lójoojúmọ́.",
    },
  },
];

export const featuredProducts = products.filter((product) => product.isFeatured);
