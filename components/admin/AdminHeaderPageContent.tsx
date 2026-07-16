"use client";

import { useLanguage } from "@/components/LanguageProvider";
import PageHeader from "@/components/shared/PageHeader";

type AdminHeaderPageContentProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export default function AdminHeaderPageContent({
  eyebrow,
  title,
  description,
}: AdminHeaderPageContentProps) {
  const { t } = useLanguage();
  const displayEyebrow =
    eyebrow && eyebrow.length > 0 ? eyebrow : t.admin.controlCenter;

  return (
    <PageHeader
      eyebrow={displayEyebrow}
      title={title}
      description={description}
    />
  );
}
