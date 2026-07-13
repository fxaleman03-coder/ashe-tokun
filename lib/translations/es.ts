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
  storefront: {
    categorySection: {
      homeLabel: "Comprar por Categoría",
      homeHeading: "Explora nuestras colecciones",
      homeSubtitle:
        "Entra a la tienda por categorías ceremoniales y devocionales enfocadas, cada una curada para descubrir con claridad.",
      shopLabel: "Explora ASHE TOKUN",
      shopHeading: "Tienda",
      shopSubtitle:
        "Explora nuestras categorías de artículos espirituales, herramientas ceremoniales, piezas artesanales y elementos devocionales.",
      viewCategory: "Ver Categoría",
      productSingular: "Producto",
      productPlural: "Productos",
      noCategoriesTitle: "No hay categorías disponibles",
      noCategoriesAvailable:
        "Las colecciones por categoría se están preparando para la tienda.",
      featuredCategory: "Categoría Destacada",
      availableOnline: "Disponible en Línea",
      category: "Categoría",
      categories: "Categorías",
      genericCategoryDescription:
        "Explora esta categoría de ASHE TOKUN a medida que nuevos productos estén disponibles.",
    },
    categoryPage: {
      breadcrumbLabel: "Ruta de navegación",
      breadcrumbHome: "Inicio",
      breadcrumbShop: "Tienda",
      label: "Categoría",
      noProductsTitle: "No hay productos disponibles",
      noProductsAvailable:
        "Esta categoría aún no tiene productos disponibles.",
      backToShop: "Volver a Tienda",
    },
    categoryLabels: {
      keychains: {
        name: "Llaveros",
        description:
          "Coleccionables simbólicos de uso diario de ASHE TOKUN y sus marcas destacadas.",
      },
      opele: {
        name: "Opele",
        description:
          "Piezas Opele y selecciones ceremoniales relacionadas para la práctica de Ifá.",
      },
      opon: {
        name: "Opon",
        description:
          "Productos Opon y piezas de exhibición conectadas con trabajo ceremonial refinado.",
      },
      ide: {
        name: "Ide",
        description:
          "Pulseras y trabajos de cuentas seleccionados para devoción, ceremonia y uso diario.",
      },
      elekes: {
        name: "Elekes",
        description:
          "Collares y piezas de cuentas creadas con tradición y trabajo cuidadoso.",
      },
      sets: {
        name: "Sets",
        description:
          "Conjuntos espirituales y ceremoniales coordinados para una presentación completa.",
      },
      mazos: {
        name: "Mazos",
        description:
          "Bastones ceremoniales y herramientas de cuentas con presencia ritual refinada.",
      },
      iruke: {
        name: "Iruke",
        description:
          "Artículos ceremoniales Iruke y piezas espirituales relacionadas preparadas para futura disponibilidad.",
      },
      irofa: {
        name: "Irofa",
        description:
          "Artículos ceremoniales Irofa y piezas espirituales relacionadas preparadas para futura disponibilidad.",
      },
    },
  },
  staff: {
    operations: "Operaciones del Personal",
    commandCenter: "Centro de Comando",
    welcome: "Bienvenido",
    role: "Rol",
    location: "Ubicación",
    logout: "Cerrar Sesión",
    openModule: "Abrir Módulo",
    commandCenterLink: "Centro de Comando",
    developmentSessionNotice:
      "Sesión de desarrollo solamente. La autenticación real con PIN se habilitará en la Fase 10.2.",
    routeProtectionNotice:
      "La protección de permisos por ruta se agregará en una subfase posterior de la Fase 10.",
    moduleNavigationNotice:
      "Los módulos operativos abren rutas admin existentes hasta activar el shell dedicado del personal.",
    login: {
      title: "Acceso del Personal",
      subtitle:
        "Ingresa tu número de empleado y PIN para preparar el acceso del personal.",
      employeeNumber: "Número de Empleado",
      pin: "PIN",
      signIn: "Iniciar Sesión",
      signingIn: "Verificando...",
      accessHelp: "Contacta a un gerente para ayuda de acceso.",
      validationEmployeeNumber: "Ingresa un número de empleado.",
      validationPin: "Ingresa un PIN numérico.",
      phaseNotice: "La autenticación del personal se habilitará en la Fase 10.2.",
    },
    security: {
      staffManagement: "Gestión del Personal",
      newEmployee: "Nuevo Empleado",
      employeeNumber: "Número de Empleado",
      temporaryPin: "PIN Temporal",
      resetPin: "Restablecer PIN",
      changePin: "Cambiar PIN",
      currentPin: "PIN Actual",
      newPin: "Nuevo PIN",
      confirmNewPin: "Confirmar Nuevo PIN",
      changePinHelp:
        "Elige un nuevo PIN numérico. Debe tener al menos 6 dígitos y no puede ser un PIN común.",
      lockAccount: "Bloquear Cuenta",
      unlockAccount: "Desbloquear Cuenta",
      revokeSessions: "Revocar Sesiones",
      deactivate: "Desactivar",
      reactivate: "Reactivar",
      archiveEmployee: "Archivar Empleado",
      resigned: "Renunció",
      terminated: "Terminado",
      retired: "Retirado",
      onLeave: "En Licencia",
      mustChangePin: "Debe Cambiar PIN",
      accountLocked: "Cuenta Bloqueada",
      invalidCredentials: "Credenciales Inválidas",
      sessionExpired: "Sesión Expirada",
      signOut: "Cerrar Sesión",
      contactManager: "Contactar Gerente",
      accessDenied: "Acceso Denegado",
    },
    permissions: {
      title: "Permisos",
      roleTemplate: "Plantilla de Rol",
      effectiveSource:
        "Los roles dan valores predeterminados. Los permisos efectivos determinan el acceso.",
      savePermissions: "Guardar Permisos",
      clonePermissions: "Clonar Permisos",
      cloneHelp: "Clonar los permisos de otro empleado a este empleado.",
      applyClone: "Aplicar Clon",
      permissionAdded: "Permiso Agregado",
      permissionRemoved: "Permiso Removido",
    },
    modules: {
      pos: {
        name: "POS",
        description: "Abrir caja.",
      },
      orders: {
        name: "Órdenes",
        description: "Revisar y gestionar órdenes de la tienda.",
      },
      customers: {
        name: "Clientes",
        description: "Buscar clientes y apoyar necesidades de servicio.",
      },
      inventory: {
        name: "Inventario",
        description: "Revisar niveles de stock y disponibilidad.",
      },
      shipping: {
        name: "Envíos",
        description: "Preparar cumplimiento y rastrear envíos.",
      },
      returns: {
        name: "Devoluciones",
        description: "Revisar flujos de devolución e intercambio.",
      },
      products: {
        name: "Productos",
        description: "Consultar productos y precios.",
      },
      receiving: {
        name: "Recepción",
        description: "Preparar control de inventario entrante.",
      },
      reports: {
        name: "Reportes",
        description: "Revisar resúmenes de rendimiento operativo.",
      },
      staff_settings: {
        name: "Ajustes del Personal",
        description: "Preparar acceso y controles de roles.",
      },
    },
    metricStatuses: {
      operational: "Operativo",
      phase101: "Fase 10.1",
      preview: "Vista previa",
      ready: "Listo",
    },
    metricLabels: {
      activeCustomers: "clientes activos",
      activeOrders: "órdenes activas",
      awaitingApproval: "esperando aprobación",
      available: "disponibles",
      buyingCustomers: "clientes con compras",
      catalogProducts: "productos del catálogo",
      completed: "completadas",
      completedTodayPending: "Completadas hoy pendiente",
      customerLookupReady: "Búsqueda de clientes lista",
      fulfillmentReady: "Fulfillment listo",
      inStore: "en tienda",
      inStoreProducts: "productos en tienda",
      incomingUnits: "unidades entrantes",
      inventoryReceivingFoundation: "Base de recepción de inventario",
      inTransit: "en tránsito",
      lowStock: "stock bajo",
      outOfStock: "agotados",
      pinLoginPending: "Acceso con PIN pendiente",
      preparing: "en preparación",
      productLookupReady: "Búsqueda de productos lista",
      registered: "registrados",
      registerReady: "Caja lista",
      reportsFoundation: "Base de reportes",
      requested: "solicitadas",
      returnsReady: "Devoluciones listas",
      revenue: "ingresos",
      roleControlsPrepared: "Controles de roles preparados",
      stockControlReady: "Control de stock listo",
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
