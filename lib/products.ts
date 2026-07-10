import type { Language } from "@/lib/translations";

type LocalizedText = Record<Language, string>;

export const productVendors = [
  "AJAKO ORIGINALS",
  "ODIBERE CREATIONS",
] as const;

export type ProductVendor = (typeof productVendors)[number];

export type Product = {
  id: string;
  slug: string;
  vendor: ProductVendor;
  name: LocalizedText;
  category: LocalizedText;
  collection?: LocalizedText;
  productType?: LocalizedText;
  tradition: LocalizedText;
  price: number;
  compareAtPrice?: number;
  image: string | null;
  inStock: boolean;
  isFeatured: boolean;
  isNew: boolean;
  shortDescription: LocalizedText;
};

const category = {
  ajako: {
    en: "AJAKO Originals",
    es: "AJAKO Originals",
    yo: "AJAKO Originals",
  },
  ide: {
    en: "Ide",
    es: "Ide",
    yo: "Ide",
  },
  ideSet: {
    en: "Ide Sets",
    es: "Sets de Ide",
    yo: "Àkójọpọ̀ Ide",
  },
  tools: {
    en: "Ceremonial Tools",
    es: "Herramientas Ceremoniales",
    yo: "Ohun Èlò Ayẹyẹ",
  },
} satisfies Record<string, LocalizedText>;

const tradition = {
  ifa: {
    en: "Ifá",
    es: "Ifá",
    yo: "Ifá",
  },
  orisha: {
    en: "Orisha",
    es: "Orisha",
    yo: "Orisha",
  },
} satisfies Record<string, LocalizedText>;

const collection = {
  keychains: {
    en: "Keychains",
    es: "Llaveros",
    yo: "Keychains",
  },
} satisfies Record<string, LocalizedText>;

const productType = {
  keychain: {
    en: "Keychain",
    es: "Llavero",
    yo: "Keychain",
  },
  opele: {
    en: "Opele",
    es: "Opele",
    yo: "Opele",
  },
} satisfies Record<string, LocalizedText>;

const vendor = {
  ajako: "AJAKO ORIGINALS",
  odibere: "ODIBERE CREATIONS",
} satisfies Record<string, ProductVendor>;

export const products: Product[] = [
  {
    id: "prod-custom-opele",
    slug: "custom-opele",
    vendor: vendor.ajako,
    name: {
      en: "Custom Opele",
      es: "Custom Opele",
      yo: "Custom Opele",
    },
    category: category.ajako,
    productType: productType.opele,
    tradition: tradition.ifa,
    price: 185,
    image: "/products/ajako-originals/opele/ajako-custom-opele-01.jpeg",
    inStock: true,
    isFeatured: true,
    isNew: true,
    shortDescription: {
      en: "A custom Opele prepared as a dedicated ceremonial tool, separate from Opele-inspired keychains.",
      es: "Un Opele personalizado preparado como herramienta ceremonial dedicada, separado de los llaveros inspirados en Opele.",
      yo: "Custom Opele fún ìṣe ayẹyẹ, yàtọ̀ sí keychain tí Opele ṣe ìmísí fún.",
    },
  },
  {
    id: "prod-opele-keychain-16-mejis",
    slug: "opele-keychain-16-mejis",
    vendor: vendor.ajako,
    name: {
      en: "16 Mejis Opele Keychain",
      es: "16 Mejis Opele Keychain",
      yo: "16 Mejis Opele Keychain",
    },
    category: category.ajako,
    collection: collection.keychains,
    productType: productType.keychain,
    tradition: tradition.ifa,
    price: 48,
    image: "/products/ajako-originals/keychains/opele-keychain-16-mejis-01.jpeg",
    inStock: true,
    isFeatured: true,
    isNew: true,
    shortDescription: {
      en: "A refined AJAKO keychain inspired by the 16 Mejis, designed for daily presence.",
      es: "Un llavero AJAKO refinado inspirado en los 16 Mejis, diseñado para uso diario.",
      yo: "Keychain AJAKO tí ó dá lórí 16 Mejis fún lílò lójoojúmọ́.",
    },
  },
  {
    id: "prod-opele-keychain-odu",
    slug: "opele-keychain-todos-los-odu",
    vendor: vendor.ajako,
    name: {
      en: "Complete Odu Opele Keychain",
      es: "Complete Odu Opele Keychain",
      yo: "Complete Odu Opele Keychain",
    },
    category: category.ajako,
    collection: collection.keychains,
    productType: productType.keychain,
    tradition: tradition.ifa,
    price: 52,
    image: "/products/ajako-originals/keychains/opele-keychain-todos-los-odu-01.jpeg",
    inStock: true,
    isFeatured: true,
    isNew: true,
    shortDescription: {
      en: "A signature AJAKO keychain honoring the Odu with a polished everyday format.",
      es: "Un llavero AJAKO distintivo inspirado en los Odu para uso cotidiano.",
      yo: "Keychain AJAKO fún Odu, rírẹwà fún lílò lójoojúmọ́.",
    },
  },
  {
    id: "prod-ireme-keychain",
    slug: "ireme-keychain",
    vendor: vendor.ajako,
    name: {
      en: "Ireme Keychain",
      es: "Llavero Ireme",
      yo: "Ireme Keychain",
    },
    category: category.ajako,
    collection: collection.keychains,
    productType: productType.keychain,
    tradition: tradition.orisha,
    price: 44,
    image: "/products/ajako-originals/keychains/ireme-keychain-01.jpeg",
    inStock: true,
    isFeatured: false,
    isNew: true,
    shortDescription: {
      en: "An original AJAKO Originals keychain inspired by the traditional Ireme, crafted as a symbolic everyday collectible.",
      es: "Un llavero original de AJAKO Originals inspirado en el Ireme tradicional, creado como un coleccionable simbólico para el día a día.",
      yo: "Keychain AJAKO Originals tí Ireme ìbílẹ̀ ṣe ìmísí fún, fún lílò ojoojúmọ́ gẹ́gẹ́ bí ohun ìrántí.",
    },
  },
  {
    id: "prod-ide-orunmila-swarovski",
    slug: "ide-orunmila-swarovski",
    vendor: vendor.odibere,
    name: {
      en: "Orunmila Swarovski Bracelet",
      es: "Orunmila Swarovski Bracelet",
      yo: "Orunmila Swarovski Bracelet",
    },
    category: category.ide,
    tradition: tradition.ifa,
    price: 85,
    image: "/products/ide/bracelet/ide-orunmila-swarovski-01.jpeg",
    inStock: true,
    isFeatured: true,
    isNew: false,
    shortDescription: {
      en: "A polished Orunmila ide with Swarovski detail and a refined ceremonial finish.",
      es: "Un ide de Orunmila con detalle Swarovski y acabado ceremonial refinado.",
      yo: "Ide Orunmila pẹ̀lú Swarovski àti ìpari rírẹwà fún ìṣe àṣà.",
    },
  },
  {
    id: "prod-ide-orunmila-madera",
    slug: "ide-orunmila-madera",
    vendor: vendor.odibere,
    name: {
      en: "Ide Orunmila Madera",
      es: "Ide Orunmila Madera",
      yo: "Ide Orunmila Madera",
    },
    category: category.ide,
    tradition: tradition.ifa,
    price: 64,
    image: "/products/ide/bracelet/ide-orunmila-madera-01.jpeg",
    inStock: true,
    isFeatured: true,
    isNew: false,
    shortDescription: {
      en: "A grounded Orunmila ide with warm wood detail and understated elegance.",
      es: "Un ide de Orunmila con madera cálida y elegancia sobria.",
      yo: "Ide Orunmila pẹ̀lú igi, rírẹwà àti pípe fún lílò.",
    },
  },
  {
    id: "prod-ide-orunmila-oro",
    slug: "ide-orunmila-oro",
    vendor: vendor.odibere,
    name: {
      en: "Ide Orunmila Oro",
      es: "Ide Orunmila Oro",
      yo: "Ide Orunmila Oro",
    },
    category: category.ide,
    tradition: tradition.ifa,
    price: 78,
    compareAtPrice: 94,
    image: "/products/ide/bracelet/ide-orunmila-oro-01.jpeg",
    inStock: true,
    isFeatured: false,
    isNew: false,
    shortDescription: {
      en: "A gold-accented Orunmila ide crafted for a refined devotional presence.",
      es: "Un ide de Orunmila con acento dorado para una presencia devocional refinada.",
      yo: "Ide Orunmila pẹ̀lú àwọ̀ wúrà fún ìbòwọ̀ rírẹwà.",
    },
  },
  {
    id: "prod-ide-oshun-yemaya",
    slug: "ide-oshun-yemaya",
    vendor: vendor.odibere,
    name: {
      en: "Oshun & Yemaya Bracelet",
      es: "Oshun & Yemaya Bracelet",
      yo: "Oshun & Yemaya Bracelet",
    },
    category: category.ide,
    tradition: tradition.orisha,
    price: 72,
    image: "/products/ide/bracelet/ide-oshun-yemaya-01.jpeg",
    inStock: true,
    isFeatured: true,
    isNew: false,
    shortDescription: {
      en: "A graceful ide combining Oshun and Yemaya colors with balanced devotional detail.",
      es: "Un ide elegante que combina colores de Oshun y Yemaya con detalle devocional equilibrado.",
      yo: "Ide rírẹwà pẹ̀lú àwọ̀ Oshun àti Yemaya fún ìbòwọ̀.",
    },
  },
  {
    id: "prod-ide-oshun-sencillo",
    slug: "ide-oshun-sencillo",
    vendor: vendor.odibere,
    name: {
      en: "Ide Oshun Sencillo",
      es: "Ide Oshun Sencillo",
      yo: "Ide Oshun Sencillo",
    },
    category: category.ide,
    tradition: tradition.orisha,
    price: 54,
    image: "/products/ide/bracelet/ide-oshun-sencillo-01.jpeg",
    inStock: true,
    isFeatured: false,
    isNew: false,
    shortDescription: {
      en: "A simple Oshun ide with warm color and an elegant devotional profile.",
      es: "Un ide sencillo de Oshun con color cálido y perfil devocional elegante.",
      yo: "Ide Oshun tó rọrùn, pẹ̀lú àwọ̀ gbígbóná àti ẹwà.",
    },
  },
  {
    id: "prod-ide-shango-corona",
    slug: "ide-shango-corona",
    vendor: vendor.odibere,
    name: {
      en: "Ide Shango Corona",
      es: "Ide Shango Corona",
      yo: "Ide Shango Corona",
    },
    category: category.ide,
    tradition: tradition.orisha,
    price: 82,
    image: "/products/ide/bracelet/ide-shango-corona-01.jpeg",
    inStock: true,
    isFeatured: false,
    isNew: true,
    shortDescription: {
      en: "A bold Shango ide with crown detail and a strong ceremonial presence.",
      es: "Un ide de Shango con detalle de corona y fuerte presencia ceremonial.",
      yo: "Ide Shango pẹ̀lú corona àti ìfarahàn ayẹyẹ tó lágbára.",
    },
  },
  {
    id: "prod-set-ide-collar-obatala",
    slug: "juego-ide-collar-obatala",
    vendor: vendor.odibere,
    name: {
      en: "Obatala Ide and Collar Set",
      es: "Juego de Ide y Collar Obatala",
      yo: "Àkójọpọ̀ Ide àti Collar Obatala",
    },
    category: category.ideSet,
    tradition: tradition.orisha,
    price: 118,
    image: "/products/ide/sets/juego-de-ide-y-collar-obatala-01.jpeg",
    inStock: true,
    isFeatured: true,
    isNew: false,
    shortDescription: {
      en: "A coordinated Obatala ide and collar set with clean ceremonial styling.",
      es: "Un set coordinado de ide y collar de Obatala con estilo ceremonial limpio.",
      yo: "Àkójọpọ̀ Ide àti Collar Obatala pẹ̀lú ìṣètò rírẹwà.",
    },
  },
  {
    id: "prod-set-ide-collar-shango",
    slug: "juego-ide-collar-shango",
    vendor: vendor.odibere,
    name: {
      en: "Shango Ide and Collar Set",
      es: "Juego de Ide y Collar Shango",
      yo: "Àkójọpọ̀ Ide àti Collar Shango",
    },
    category: category.ideSet,
    tradition: tradition.orisha,
    price: 124,
    image: "/products/ide/sets/juego-de-ide-y-collar-shango-01.jpeg",
    inStock: true,
    isFeatured: false,
    isNew: false,
    shortDescription: {
      en: "A coordinated Shango set with vibrant color and ceremonial balance.",
      es: "Un set coordinado de Shango con color vibrante y equilibrio ceremonial.",
      yo: "Àkójọpọ̀ Shango pẹ̀lú àwọ̀ tó hàn àti ìwọ̀ntúnwọ̀nsì ayẹyẹ.",
    },
  },
  {
    id: "prod-set-ide-collar-olokun",
    slug: "juego-ide-collar-olokun",
    vendor: vendor.odibere,
    name: {
      en: "Olokun Ide and Collar Set",
      es: "Juego de Ide y Collar Olokun",
      yo: "Àkójọpọ̀ Ide àti Collar Olokun",
    },
    category: category.ideSet,
    tradition: tradition.orisha,
    price: 128,
    image: "/products/ide/sets/juego-de-ide-y-collar-olokun-01.jpeg",
    inStock: true,
    isFeatured: false,
    isNew: true,
    shortDescription: {
      en: "A complete Olokun ide and collar set with a composed devotional finish.",
      es: "Un set completo de ide y collar de Olokun con acabado devocional sereno.",
      yo: "Àkójọpọ̀ Ide àti Collar Olokun pẹ̀lú ìpari ìbòwọ̀ tó dára.",
    },
  },
  {
    id: "prod-mazo-elegua",
    slug: "mazo-elegua",
    vendor: vendor.odibere,
    name: {
      en: "Elegua Ceremonial Staff",
      es: "Elegua Ceremonial Staff",
      yo: "Elegua Ceremonial Staff",
    },
    category: category.tools,
    tradition: tradition.orisha,
    price: 135,
    compareAtPrice: 165,
    image: "/products/tools/irofa/mazo-elegua-01.jpeg",
    inStock: true,
    isFeatured: true,
    isNew: false,
    shortDescription: {
      en: "A ceremonial mazo for Elegua with traditional presence and careful handwork.",
      es: "Un mazo ceremonial para Elegua con presencia tradicional y trabajo cuidadoso.",
      yo: "Mazo ayẹyẹ fún Elegua pẹ̀lú ìṣe ọwọ́ àti ìtẹ́lọ́run.",
    },
  },
  {
    id: "prod-mazo-obatala",
    slug: "mazo-obatala",
    vendor: vendor.odibere,
    name: {
      en: "Mazo Obatala",
      es: "Mazo Obatala",
      yo: "Mazo Obatala",
    },
    category: category.tools,
    tradition: tradition.orisha,
    price: 138,
    image: "/products/tools/irofa/mazo-obatala-01.jpeg",
    inStock: true,
    isFeatured: true,
    isNew: false,
    shortDescription: {
      en: "A refined Obatala mazo with ceremonial form and balanced visual detail.",
      es: "Un mazo refinado de Obatala con forma ceremonial y detalle equilibrado.",
      yo: "Mazo Obatala rírẹwà pẹ̀lú ìwòye ayẹyẹ àti àlàyé tó dára.",
    },
  },
  {
    id: "prod-mazo-shango",
    slug: "mazo-shango",
    vendor: vendor.odibere,
    name: {
      en: "Mazo Shango",
      es: "Mazo Shango",
      yo: "Mazo Shango",
    },
    category: category.tools,
    tradition: tradition.orisha,
    price: 142,
    image: "/products/tools/irofa/mazo-shango-01.jpeg",
    inStock: true,
    isFeatured: false,
    isNew: false,
    shortDescription: {
      en: "A strong Shango mazo with bold presence for ceremonial display and practice.",
      es: "Un mazo de Shango con presencia fuerte para práctica y exhibición ceremonial.",
      yo: "Mazo Shango tó lágbára fún ìṣe àti ìfihàn ayẹyẹ.",
    },
  },
  {
    id: "prod-mazo-ogun",
    slug: "mazo-ogun",
    vendor: vendor.odibere,
    name: {
      en: "Mazo Ogun",
      es: "Mazo Ogun",
      yo: "Mazo Ogun",
    },
    category: category.tools,
    tradition: tradition.orisha,
    price: 136,
    image: "/products/tools/irofa/mazo-ogun-01.jpeg",
    inStock: true,
    isFeatured: false,
    isNew: false,
    shortDescription: {
      en: "A ceremonial Ogun mazo with grounded styling and hand-finished detail.",
      es: "Un mazo ceremonial de Ogun con estilo sobrio y detalle trabajado a mano.",
      yo: "Mazo Ogun fún ayẹyẹ pẹ̀lú ìṣe ọwọ́ àti ìtọ́jú.",
    },
  },
];

export const featuredProducts = products.filter((product) => product.isFeatured);
