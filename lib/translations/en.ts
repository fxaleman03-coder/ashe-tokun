import type { Translation } from "@/lib/translations";

const en: Translation = {
  brand: {
    name: "ASHE TOKUN",
    homeLabel: "ASHE TOKUN home",
  },
  nav: {
    links: ["Home", "Shop", "About", "Contact"],
    cta: "Visit Store",
  },
  hero: {
    label: "ASHE TOKUN",
    headline: "Tradition, faith, and spiritual power in every detail.",
    subtitle:
      "Premium religious articles, ceremonial tools, spiritual supplies, handcrafted pieces, and authentic traditions.",
    primaryButton: "Explore Collection",
    secondaryButton: "Visit Our Store",
    logoAlt: "ASHE TOKUN logo",
  },
  traditions: {
    label: "Explore Our Traditions",
    heading: "Sacred essentials, selected with care.",
    subtitle:
      "Discover ceremonial categories shaped by devotion, heritage, and refined spiritual practice.",
    cardButton: "Explore",
    cards: [
      {
        title: "Ifá",
        description:
          "Traditional articles and tools connected to wisdom, guidance, and sacred study.",
        imageSrc: "/categories/ifa.svg",
        imageAlt: "Ifá category placeholder",
      },
      {
        title: "Òrìṣà",
        description:
          "Devotional pieces and ceremonial essentials honoring revered spiritual traditions.",
        imageSrc: "/categories/orisa.svg",
        imageAlt: "Òrìṣà category placeholder",
      },
      {
        title: "Spiritual Supplies",
        description:
          "Premium supplies for cleansing, preparation, offerings, and intentional practice.",
        imageSrc: "/categories/spiritual-supplies.svg",
        imageAlt: "Spiritual supplies category placeholder",
      },
      {
        title: "Devotional Articles",
        description:
          "Elegant religious articles crafted for daily reverence, reflection, and devotion.",
        imageSrc: "/categories/devotional-articles.svg",
        imageAlt: "Devotional articles category placeholder",
      },
    ],
  },
  featuredProducts: {
    label: "Featured Products",
    heading: "Featured Products",
    subtitle:
      "Hand-selected spiritual articles for devotion, ceremony, and daily practice.",
    labels: {
      viewProduct: "View Product",
      addToCart: "Add to Cart",
      inStock: "Ready to Ship",
      soldOut: "Currently Unavailable",
      new: "New",
      featured: "Featured",
      newArrival: "New Arrival",
      ajakoOriginals: "AJAKO Originals",
      handcrafted: "Handcrafted",
      limitedEdition: "Limited Edition",
      bestSeller: "Best Seller",
    },
  },
  productPage: {
    breadcrumbHome: "Home",
    breadcrumbShop: "Shop",
    details: "Details",
    materials: "Materials",
    spiritualNote: "Spiritual Note",
    shipping: "Shipping",
    addToCart: "Add to Cart",
    backToShop: "Back to Shop",
    productNotFound: "Product not found",
    productNotFoundDescription:
      "This item is not available in the ASHE TOKUN catalog right now.",
    detailsPlaceholder:
      "A premium ASHE TOKUN selection prepared for ceremonial, devotional, or daily spiritual use.",
    materialsPlaceholder:
      "Material details will be confirmed as the official product catalog is finalized.",
    spiritualNotePlaceholder:
      "Cultural and spiritual guidance will be reviewed with knowledgeable practitioners before publication.",
    shippingPlaceholder:
      "Shipping options and handling times will be added before checkout functionality launches.",
  },
  storefront: {
    categorySection: {
      homeLabel: "Shop by Category",
      homeHeading: "Explore our collections",
      homeSubtitle:
        "Enter the store through focused ceremonial and devotional categories, each curated for clear discovery.",
      shopLabel: "Explore ASHE TOKUN",
      shopHeading: "Shop",
      shopSubtitle:
        "Browse our categories across spiritual articles, ceremonial tools, handcrafted pieces, and devotional essentials.",
      viewCategory: "View Category",
      productSingular: "Product",
      productPlural: "Products",
      noCategoriesTitle: "No categories available",
      noCategoriesAvailable:
        "Category collections are being prepared for the storefront.",
      featuredCategory: "Featured Category",
      availableOnline: "Available Online",
      category: "Category",
      categories: "Categories",
      genericCategoryDescription:
        "Explore this ASHE TOKUN category as new products become available.",
    },
    categoryPage: {
      breadcrumbLabel: "Breadcrumb",
      breadcrumbHome: "Home",
      breadcrumbShop: "Shop",
      label: "Category",
      noProductsTitle: "No products available",
      noProductsAvailable:
        "This category does not have available products yet.",
      backToShop: "Back to Shop",
    },
    categoryLabels: {
      keychains: {
        name: "Keychains",
        description:
          "Symbolic everyday collectibles from ASHE TOKUN and its featured brands.",
      },
      opele: {
        name: "Opele",
        description:
          "Opele pieces and related ceremonial selections prepared for Ifá practice.",
      },
      opon: {
        name: "Opon",
        description:
          "Opon products and display pieces connected to refined ceremonial work.",
      },
      ide: {
        name: "Ide",
        description:
          "Bracelets and beadwork selected for devotion, ceremony, and daily wear.",
      },
      elekes: {
        name: "Elekes",
        description:
          "Necklaces and beadwork pieces shaped by tradition and careful handwork.",
      },
      sets: {
        name: "Sets",
        description:
          "Coordinated spiritual and ceremonial sets for complete presentation.",
      },
      mazos: {
        name: "Mazos",
        description:
          "Ceremonial staffs and beadwork tools with a refined ritual presence.",
      },
      iruke: {
        name: "Iruke",
        description:
          "Iruke ceremonial items and related spiritual pieces prepared for future availability.",
      },
      irofa: {
        name: "Irofa",
        description:
          "Irofa ceremonial items and related spiritual pieces prepared for future availability.",
      },
    },
  },
  staff: {
    operations: "Staff Operations",
    commandCenter: "Command Center",
    welcome: "Welcome",
    role: "Role",
    businessTitle: "Business Title",
    securityRole: "Security Role",
    location: "Location",
    logout: "Logout",
    openModule: "Open Module",
    commandCenterLink: "Command Center",
    developmentSessionNotice:
      "Development session only. Real PIN authentication will be enabled in Phase 10.2.",
    routeProtectionNotice:
      "Route-level permission protection will be added in a later Phase 10 subphase.",
    moduleNavigationNotice:
      "Operational modules currently open existing admin routes until the dedicated staff shell is activated.",
    login: {
      title: "Staff Sign In",
      subtitle: "Enter your employee number and PIN to prepare for staff access.",
      employeeNumber: "Employee Number",
      pin: "PIN",
      signIn: "Sign In",
      signingIn: "Checking...",
      accessHelp: "Contact a manager for access assistance.",
      validationEmployeeNumber: "Enter an employee number.",
      validationPin: "Enter a numeric PIN.",
      phaseNotice: "Staff authentication will be enabled in Phase 10.2.",
    },
    security: {
      staffManagement: "Staff Management",
      newEmployee: "New Employee",
      employeeNumber: "Employee Number",
      temporaryPin: "Temporary PIN",
      resetPin: "Reset PIN",
      changePin: "Change PIN",
      currentPin: "Current PIN",
      newPin: "New PIN",
      confirmNewPin: "Confirm New PIN",
      changePinHelp:
        "Choose a new numeric PIN. It must be at least 6 digits and cannot be a common PIN.",
      lockAccount: "Lock Account",
      unlockAccount: "Unlock Account",
      revokeSessions: "Revoke Sessions",
      deactivate: "Deactivate",
      reactivate: "Reactivate",
      archiveEmployee: "Archive Employee",
      resigned: "Resigned",
      terminated: "Terminated",
      retired: "Retired",
      onLeave: "On Leave",
      mustChangePin: "Must Change PIN",
      accountLocked: "Account Locked",
      invalidCredentials: "Invalid Credentials",
      sessionExpired: "Session Expired",
      signOut: "Sign Out",
      contactManager: "Contact Manager",
      accessDenied: "Access Denied",
    },
    permissions: {
      title: "Permissions",
      roleTemplate: "Role Template",
      effectiveSource:
        "Roles provide defaults. Effective permissions determine access.",
      savePermissions: "Save Permissions",
      clonePermissions: "Clone Permissions",
      cloneHelp: "Clone another employee permission set into this employee.",
      applyClone: "Apply Clone",
      permissionAdded: "Permission Added",
      permissionRemoved: "Permission Removed",
    },
    roles: {
      owner: "Owner",
      managingPartner: "Managing Partner",
      storeManager: "Store Manager",
      assistantManager: "Assistant Manager",
      inventorySpecialist: "Inventory Specialist",
      shippingFulfillment: "Shipping & Fulfillment",
      customerService: "Customer Service",
      cashier: "Cashier",
      accounting: "Accounting",
      marketingEcommerce: "Marketing & E-Commerce",
      executiveLeadership: "Executive Leadership",
      ownerOnlyGovernance: "Owner-Only Governance",
    },
    modules: {
      pos: {
        name: "POS",
        description: "Open Register",
      },
      orders: {
        name: "Orders",
        description: "Review and manage store orders.",
      },
      customers: {
        name: "Customers",
        description: "Find customers and support service needs.",
      },
      inventory: {
        name: "Inventory",
        description: "Check stock levels and item availability.",
      },
      shipping: {
        name: "Shipping",
        description: "Prepare fulfillment and track shipments.",
      },
      returns: {
        name: "Returns",
        description: "Review return and exchange workflows.",
      },
      scheduling: {
        name: "Scheduling",
        description: "Manage staff schedules, availability, and time off.",
      },
      timekeeper: {
        name: "Timekeeper",
        description: "Clock in, manage breaks, and review timecards.",
      },
      my_schedule: {
        name: "My Schedule",
        description: "View today’s shift and upcoming schedule.",
      },
      availability: {
        name: "Availability",
        description: "Update your recurring availability.",
      },
      time_off: {
        name: "Request Time Off",
        description: "Submit and review time-off requests.",
      },
      products: {
        name: "Products",
        description: "Look up product records and pricing.",
      },
      receiving: {
        name: "Receiving",
        description: "Prepare incoming inventory control.",
      },
      reports: {
        name: "Reports",
        description: "Review operational performance snapshots.",
      },
      staff_settings: {
        name: "Staff Settings",
        description: "Prepare staff access and role controls.",
      },
    },
    metricStatuses: {
      operational: "Operational",
      phase101: "Phase 10.1",
      preview: "Preview",
      ready: "Ready",
    },
    metricLabels: {
      activeCustomers: "active customers",
      activeOrders: "active orders",
      awaitingApproval: "awaiting approval",
      available: "available",
      buyingCustomers: "buying customers",
      catalogProducts: "catalog products",
      completed: "completed",
      completedTodayPending: "Completed today pending",
      customerLookupReady: "Customer lookup ready",
      fulfillmentReady: "Fulfillment ready",
      inStore: "in store",
      inStoreProducts: "in-store products",
      incomingUnits: "incoming units",
      inventoryReceivingFoundation: "Inventory receiving foundation",
      inTransit: "in transit",
      lowStock: "low stock",
      outOfStock: "out of stock",
      pinLoginPending: "PIN login pending",
      preparing: "preparing",
      productLookupReady: "Product lookup ready",
      registered: "registered",
      registerReady: "Register ready",
      reportsFoundation: "Reports foundation",
      requested: "requested",
      returnsReady: "Returns ready",
      revenue: "revenue",
      roleControlsPrepared: "Role controls prepared",
      schedulePublishedStatus: "Schedule published status",
      schedulingReady: "Scheduling ready",
      todayShift: "today’s shift",
      nextScheduledShift: "next scheduled shift",
      clockedOut: "clocked out",
      timekeeperReady: "Timekeeper ready",
      viewTimecard: "view timecard",
      pendingTimeOffRequest: "pending request",
      stockControlReady: "Stock control ready",
    },
    timekeeper: {
      timekeeper: "Timekeeper",
      clockIn: "Clock In",
      clockOut: "Clock Out",
      startBreak: "Start Break",
      endBreak: "End Break",
      onBreak: "On Break",
      clockedIn: "Clocked In",
      clockedOut: "Clocked Out",
      todaysShift: "Today’s Shift",
      workedToday: "Worked Today",
      breakTime: "Break Time",
      punchHistory: "Punch History",
      timecard: "Timecard",
      pendingReview: "Pending Review",
      approved: "Approved",
      incomplete: "Incomplete",
      reopened: "Reopened",
      addMissedPunch: "Add Missed Punch",
      correctPunch: "Correct Punch",
      lateArrival: "Late Arrival",
      earlyDeparture: "Early Departure",
      missingPunch: "Missing Punch",
      unscheduledWork: "Unscheduled Work",
      invalidPunchSequence: "Invalid Punch Sequence",
      approveTimecard: "Approve Timecard",
      reopenTimecard: "Reopen Timecard",
      resolutionNotes: "Resolution Notes",
      unableToClockIn: "Unable to Clock In",
      punchRecordedSuccessfully: "Punch Recorded Successfully",
    },
    scheduling: {
      scheduling: "Scheduling",
      mySchedule: "My Schedule",
      weeklySchedule: "Weekly Schedule",
      newSchedule: "New Schedule",
      draft: "Draft",
      published: "Published",
      archived: "Archived",
      shift: "Shift",
      startTime: "Start Time",
      endTime: "End Time",
      break: "Break",
      availability: "Availability",
      timeOff: "Time Off",
      requestTimeOff: "Request Time Off",
      approve: "Approve",
      deny: "Deny",
      cancelShift: "Cancel Shift",
      reassign: "Reassign",
      copyPreviousWeek: "Copy Previous Week",
      publishSchedule: "Publish Schedule",
      conflict: "Conflict",
      outsideAvailability: "Outside Availability",
      approvedTimeOff: "Approved Time Off",
      noShiftScheduled: "No Shift Scheduled",
      todaysShift: "Today’s Shift",
      nextShift: "Next Shift",
      pendingRequest: "Pending Request",
      scheduleNotPublished: "Schedule Not Published",
    },
  },
  footer: {
    copyright: (year: number) =>
      `© ${year} ASHE TOKUN. All rights reserved.`,
  },
  languageToggle: {
    label: "Language selector",
  },
};

export default en;
