import en from "@/lib/translations/en";
import es from "@/lib/translations/es";
import yo from "@/lib/translations/yo";

export type Translation = {
  brand: {
    name: string;
    homeLabel: string;
  };
  nav: {
    links: readonly [string, string, string, string];
    cta: string;
  };
  hero: {
    label: string;
    headline: string;
    subtitle: string;
    primaryButton: string;
    secondaryButton: string;
    logoAlt: string;
  };
  traditions: {
    label: string;
    heading: string;
    subtitle: string;
    cardButton: string;
    cards: readonly {
      title: string;
      description: string;
      imageSrc: string;
      imageAlt: string;
    }[];
  };
  featuredProducts: {
    label: string;
    heading: string;
    subtitle: string;
    labels: {
      viewProduct: string;
      addToCart: string;
      inStock: string;
      soldOut: string;
      new: string;
      featured: string;
      newArrival: string;
      ajakoOriginals: string;
      handcrafted: string;
      limitedEdition: string;
      bestSeller: string;
    };
  };
  productPage: {
    breadcrumbHome: string;
    breadcrumbShop: string;
    details: string;
    materials: string;
    spiritualNote: string;
    shipping: string;
    addToCart: string;
    backToShop: string;
    productNotFound: string;
    productNotFoundDescription: string;
    detailsPlaceholder: string;
    materialsPlaceholder: string;
    spiritualNotePlaceholder: string;
    shippingPlaceholder: string;
  };
  storefront: {
    categorySection: {
      homeLabel: string;
      homeHeading: string;
      homeSubtitle: string;
      shopLabel: string;
      shopHeading: string;
      shopSubtitle: string;
      viewCategory: string;
      productSingular: string;
      productPlural: string;
      noCategoriesTitle: string;
      noCategoriesAvailable: string;
      featuredCategory: string;
      availableOnline: string;
      category: string;
      categories: string;
      genericCategoryDescription: string;
    };
    categoryPage: {
      breadcrumbLabel: string;
      breadcrumbHome: string;
      breadcrumbShop: string;
      label: string;
      noProductsTitle: string;
      noProductsAvailable: string;
      backToShop: string;
    };
    categoryLabels: Record<
      string,
      {
        name: string;
        description: string;
      }
    >;
  };
  staff: {
    operations: string;
    commandCenter: string;
    welcome: string;
    role: string;
    businessTitle: string;
    securityRole: string;
    location: string;
    logout: string;
    openModule: string;
    commandCenterLink: string;
    global: {
      admin: string;
      staff: string;
      dashboard: string;
      payroll: string;
      payrollPeriod: string;
      employeeDetail: string;
      employeeProfile: string;
      timekeeper: string;
      timecardDetail: string;
      scheduling: string;
      workingWeek: string;
      products: string;
      inventory: string;
      orders: string;
      customers: string;
      shipping: string;
      returns: string;
      settings: string;
      database: string;
      new: string;
      edit: string;
      employees: string;
      availability: string;
      timeOff: string;
      detail: string;
      myProfile: string;
      accountSettings: string;
      activityLog: string;
      signOut: string;
      notifications: string;
      noNewNotifications: string;
      quickActions: string;
      newEmployee: string;
      createPayrollPeriod: string;
      createSchedule: string;
      addProduct: string;
      receiveInventory: string;
      openPOS: string;
      businessTitle: string;
      securityRole: string;
      notAssigned: string;
    };
    developmentSessionNotice: string;
    routeProtectionNotice: string;
    moduleNavigationNotice: string;
    login: {
      title: string;
      subtitle: string;
      employeeNumber: string;
      pin: string;
      signIn: string;
      signingIn: string;
      accessHelp: string;
      validationEmployeeNumber: string;
      validationPin: string;
      phaseNotice: string;
    };
    security: {
      staffManagement: string;
      newEmployee: string;
      employeeNumber: string;
      temporaryPin: string;
      resetPin: string;
      changePin: string;
      currentPin: string;
      newPin: string;
      confirmNewPin: string;
      changePinHelp: string;
      lockAccount: string;
      unlockAccount: string;
      revokeSessions: string;
      deactivate: string;
      reactivate: string;
      archiveEmployee: string;
      resigned: string;
      terminated: string;
      retired: string;
      onLeave: string;
      mustChangePin: string;
      accountLocked: string;
      invalidCredentials: string;
      sessionExpired: string;
      signOut: string;
      contactManager: string;
      accessDenied: string;
    };
    permissions: {
      title: string;
      roleTemplate: string;
      effectiveSource: string;
      savePermissions: string;
      clonePermissions: string;
      cloneHelp: string;
      applyClone: string;
      permissionAdded: string;
      permissionRemoved: string;
    };
    roles: {
      owner: string;
      managingPartner: string;
      storeManager: string;
      assistantManager: string;
      inventorySpecialist: string;
      shippingFulfillment: string;
      customerService: string;
      cashier: string;
      accounting: string;
      marketingEcommerce: string;
      executiveLeadership: string;
      ownerOnlyGovernance: string;
    };
    modules: {
      pos: { name: string; description: string };
      orders: { name: string; description: string };
      customers: { name: string; description: string };
      inventory: { name: string; description: string };
      shipping: { name: string; description: string };
      returns: { name: string; description: string };
      scheduling: { name: string; description: string };
      timekeeper: { name: string; description: string };
      payroll: { name: string; description: string };
      my_schedule: { name: string; description: string };
      availability: { name: string; description: string };
      time_off: { name: string; description: string };
      products: { name: string; description: string };
      receiving: { name: string; description: string };
      reports: { name: string; description: string };
      staff_settings: { name: string; description: string };
    };
    metricStatuses: {
      operational: string;
      phase101: string;
      preview: string;
      ready: string;
    };
    metricLabels: {
      activeCustomers: string;
      activeOrders: string;
      awaitingApproval: string;
      available: string;
      buyingCustomers: string;
      catalogProducts: string;
      completed: string;
      completedTodayPending: string;
      customerLookupReady: string;
      fulfillmentReady: string;
      inStore: string;
      inStoreProducts: string;
      incomingUnits: string;
      inventoryReceivingFoundation: string;
      inTransit: string;
      lowStock: string;
      outOfStock: string;
      pinLoginPending: string;
      preparing: string;
      productLookupReady: string;
      registered: string;
      registerReady: string;
      reportsFoundation: string;
      requested: string;
      returnsReady: string;
      revenue: string;
      roleControlsPrepared: string;
      schedulePublishedStatus: string;
      schedulingReady: string;
      todayShift: string;
      nextScheduledShift: string;
      clockedOut: string;
      timekeeperReady: string;
      viewTimecard: string;
      pendingTimeOffRequest: string;
      stockControlReady: string;
    };
    timekeeper: {
      timekeeper: string;
      clockIn: string;
      clockOut: string;
      startBreak: string;
      endBreak: string;
      onBreak: string;
      clockedIn: string;
      clockedOut: string;
      todaysShift: string;
      workedToday: string;
      breakTime: string;
      punchHistory: string;
      timecard: string;
      pendingReview: string;
      approved: string;
      incomplete: string;
      reopened: string;
      addMissedPunch: string;
      correctPunch: string;
      lateArrival: string;
      earlyDeparture: string;
      missingPunch: string;
      unscheduledWork: string;
      invalidPunchSequence: string;
      approveTimecard: string;
      reopenTimecard: string;
      resolutionNotes: string;
      unableToClockIn: string;
      punchRecordedSuccessfully: string;
    };
    payroll: {
      payroll: string;
      currentPayPeriod: string;
      employees: string;
      approvedTimecards: string;
      pendingTimecards: string;
      regularHours: string;
      overtimeHours: string;
      totalPayrollHours: string;
      generatePayroll: string;
      refreshPayrollData: string;
      exportCsv: string;
      exportExcel: string;
      payrollPeriodPdf: string;
      payrollPackage: string;
      payrollPdf: string;
      approvalStatus: string;
      createPayrollPeriod: string;
      periodName: string;
      periodType: string;
      payDate: string;
      location: string;
      approveEmployee: string;
      reviewEmployee: string;
      excludeEmployee: string;
      includeEmployee: string;
      approvePeriod: string;
      closePeriod: string;
      reopenPeriod: string;
      payrollReady: string;
      incompletePayroll: string;
      payrollGenerated: string;
      exportComplete: string;
      packageGenerated: string;
    };
    scheduling: {
      scheduling: string;
      mySchedule: string;
      weeklySchedule: string;
      newSchedule: string;
      draft: string;
      published: string;
      archived: string;
      shift: string;
      startTime: string;
      endTime: string;
      break: string;
      availability: string;
      timeOff: string;
      requestTimeOff: string;
      approve: string;
      deny: string;
      cancelShift: string;
      reassign: string;
      copyPreviousWeek: string;
      publishSchedule: string;
      conflict: string;
      outsideAvailability: string;
      approvedTimeOff: string;
      noShiftScheduled: string;
      todaysShift: string;
      nextShift: string;
      pendingRequest: string;
      scheduleNotPublished: string;
    };
  };
  footer: {
    copyright: (year: number) => string;
  };
  languageToggle: {
    label: string;
  };
};

export const translations = {
  en,
  es,
  yo,
} as const;

export const languageOptions = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
] as const satisfies ReadonlyArray<{
  code: Exclude<Language, "yo">;
  label: string;
}>;

export type Language = keyof typeof translations;
