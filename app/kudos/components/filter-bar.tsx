"use client";

import { useTranslations } from "next-intl";
import type { DepartmentRef, FilterState, HashtagRef } from "@/lib/kudos/types";
import { FilterDropdown } from "./filter-dropdown";

export interface FilterBarProps {
  hashtags: HashtagRef[];
  departments: DepartmentRef[];
  value: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

/**
 * Hashtag + Phòng ban single-select dropdowns, AND-combined (FR4). The
 * department filter matches the kudos RECEIVER's department (recognition
 * board filters by who is being celebrated), per the resolved clarification.
 */
export function FilterBar({ hashtags, departments, value, onFilterChange }: FilterBarProps) {
  const t = useTranslations("KudosPage.highlight");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterDropdown
        label={t("hashtagFilter")}
        allLabel={t("allHashtags")}
        options={hashtags.map((h) => ({ id: h.id, label: h.label }))}
        selectedId={value.hashtagId}
        onChange={(hashtagId) => onFilterChange({ ...value, hashtagId })}
      />
      <FilterDropdown
        label={t("departmentFilter")}
        allLabel={t("allDepartments")}
        options={departments.map((d) => ({ id: d.id, label: d.name }))}
        selectedId={value.departmentId}
        onChange={(departmentId) => onFilterChange({ ...value, departmentId })}
      />
    </div>
  );
}
