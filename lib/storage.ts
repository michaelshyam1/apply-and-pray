"use client";

import type { Application } from "./types";

const STORAGE_KEY = "aap_applications";

export function getApplications(): Application[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Application[];
  } catch {
    return [];
  }
}

export function saveApplications(applications: Application[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

export function addApplication(application: Application): Application[] {
  const applications = getApplications();
  const updated = [application, ...applications];
  saveApplications(updated);
  return updated;
}

export function updateApplication(
  id: string,
  updates: Partial<Application>
): Application[] {
  const applications = getApplications();
  const updated = applications.map((a) =>
    a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
  );
  saveApplications(updated);
  return updated;
}

export function deleteApplication(id: string): Application[] {
  const applications = getApplications();
  const updated = applications.filter((a) => a.id !== id);
  saveApplications(updated);
  return updated;
}
