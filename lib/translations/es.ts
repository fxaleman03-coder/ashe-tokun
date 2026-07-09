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
      inStock: "Disponible",
      soldOut: "Agotado",
      new: "Nuevo",
      featured: "Destacado",
    },
  },
  footer: {
    copyright: (year) => `© ${year} ASHE TOKUN. Todos los derechos reservados.`,
  },
  languageToggle: {
    label: "Selector de idioma",
  },
};

export default es;
