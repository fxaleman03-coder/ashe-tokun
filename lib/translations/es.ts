import type { Translation } from "@/lib/translations";

const es: Translation = {
  brand: {
    name: "ASHE TOKUN",
    homeLabel: "ASHE TOKUN home",
  },
  nav: {
    links: ["Inicio", "Tienda", "Nosotros", "Contacto"],
    cta: "Visitar Tienda",
  },
  hero: {
    label: "ASHE TOKUN",
    headline: "Tradición, fe y poder espiritual en cada detalle.",
    subtitle:
      "Artículos religiosos premium, herramientas ceremoniales, suministros espirituales, piezas artesanales y tradiciones auténticas.",
    primaryButton: "Ver Colección",
    secondaryButton: "Visitar Tienda",
    logoAlt: "ASHE TOKUN logo",
  },
  traditions: {
    label: "Explora Nuestras Tradiciones",
    heading: "Elementos sagrados, seleccionados con cuidado.",
    subtitle:
      "Descubre categorías ceremoniales guiadas por devoción, herencia y práctica espiritual refinada.",
    cardButton: "Explorar",
    cards: [
      {
        title: "Ifá",
        description:
          "Artículos y herramientas tradicionales vinculados con sabiduría, guía y estudio sagrado.",
        imageSrc: "/categories/ifa.svg",
        imageAlt: "Imagen provisional de la categoría Ifá",
      },
      {
        title: "Òrìṣà",
        description:
          "Piezas devocionales y elementos ceremoniales para honrar tradiciones espirituales veneradas.",
        imageSrc: "/categories/orisa.svg",
        imageAlt: "Imagen provisional de la categoría Òrìṣà",
      },
      {
        title: "Suministros Espirituales",
        description:
          "Suministros premium para limpieza, preparación, ofrendas y práctica intencional.",
        imageSrc: "/categories/spiritual-supplies.svg",
        imageAlt: "Imagen provisional de suministros espirituales",
      },
      {
        title: "Artículos Devocionales",
        description:
          "Artículos religiosos elegantes para reverencia diaria, reflexión y devoción.",
        imageSrc: "/categories/devotional-articles.svg",
        imageAlt: "Imagen provisional de artículos devocionales",
      },
    ],
  },
  featuredProducts: {
    label: "Productos Destacados",
    heading: "Productos Destacados",
    subtitle:
      "Artículos espirituales seleccionados para devoción, ceremonia y práctica diaria.",
    labels: {
      viewProduct: "Ver Producto",
      addToCart: "Agregar",
      inStock: "Listo para Enviar",
      soldOut: "Actualmente No Disponible",
      new: "Nuevo",
      featured: "Destacado",
      newArrival: "Nuevo Lanzamiento",
      ajakoOriginals: "AJAKO Originals",
      handcrafted: "Hecho a Mano",
      limitedEdition: "Edición Limitada",
      bestSeller: "Más Vendido",
    },
  },
  productPage: {
    breadcrumbHome: "Inicio",
    breadcrumbShop: "Tienda",
    details: "Detalles",
    materials: "Materiales",
    spiritualNote: "Nota Espiritual",
    shipping: "Envío",
    addToCart: "Agregar",
    backToShop: "Volver a Tienda",
    productNotFound: "Producto no encontrado",
    productNotFoundDescription:
      "Este artículo no está disponible en el catálogo de ASHE TOKUN en este momento.",
    detailsPlaceholder:
      "Una selección premium de ASHE TOKUN preparada para uso ceremonial, devocional o espiritual diario.",
    materialsPlaceholder:
      "Los detalles de materiales se confirmarán cuando el catálogo oficial esté finalizado.",
    spiritualNotePlaceholder:
      "La guía cultural y espiritual será revisada con practicantes conocedores antes de publicarse.",
    shippingPlaceholder:
      "Las opciones de envío y tiempos de manejo se agregarán antes de lanzar el checkout.",
  },
  footer: {
    copyright: (year) => `© ${year} ASHE TOKUN. Todos los derechos reservados.`,
  },
  languageToggle: {
    label: "Selector de idioma",
  },
};

export default es;
