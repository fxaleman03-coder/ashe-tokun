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
  footer: {
    copyright: (year) => `© ${year} ASHE TOKUN. Todos los derechos reservados.`,
  },
  languageToggle: {
    label: "Selector de idioma",
  },
};

export default es;
