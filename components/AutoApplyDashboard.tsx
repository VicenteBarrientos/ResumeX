"use client";

import { useState, useEffect } from "react";
import ApplicationsTab from "@/components/autoapply/ApplicationsTab";
import ProfileTab from "@/components/autoapply/ProfileTab";
import AnswersTab from "@/components/autoapply/AnswersTab";
import type { Application, CandidateProfile } from "@/lib/autoapply-types";

const TABS = [
  { id: "applications", label: "📋 Applications" },
  { id: "profile", label: "👤 My Profile" },
  { id: "answers", label: "✏️ Answers" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STORAGE_KEYS = {
  applications: "autoapply_applications",
  profile: "autoapply_profile",
};

const DEFAULT_PROFILE: CandidateProfile = {
  personal: { firstName: "", lastName: "", email: "", phone: "", location: "", linkedinUrl: "", githubUrl: "" },
  target: { roles: [], salaryMin: 0, salaryMax: 0, currency: "USD", remote: true, willingToRelocate: false, startAvailability: "2 weeks" },
  experience: { totalYears: 0, currentTitle: "", currentCompany: "", summary: "" },
  skills: [],
  workAuthorization: { country: "", status: "", requiresSponsorship: false },
  coverLetterTemplate: "",
};

export default function AutoApplyDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("applications");
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<CandidateProfile>(DEFAULT_PROFILE);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage first (instant)
    try {
      const storedApps = localStorage.getItem(STORAGE_KEYS.applications);
      if (storedApps) setApplications(JSON.parse(storedApps));
      const storedProfile = localStorage.getItem(STORAGE_KEYS.profile);
      if (storedProfile) setProfile(JSON.parse(storedProfile));
    } catch {}

    // Hydrate profile from DB
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.profileJson) {
          setProfile(data.profileJson);
          localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(data.profileJson));
        }
      })
      .catch(() => {});

    // Merge DB tracker applications (logged via Chrome extension or tracker UI)
    fetch("/api/tracker")
      .then((r) => r.json())
      .then((dbApps: Array<{ id: string; company: string; role: string; jobUrl: string | null; status: string; createdAt: string }>) => {
        if (!Array.isArray(dbApps)) return;
        setApplications((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const mapped = dbApps
            .filter((a) => !existingIds.has(a.id))
            .map((a) => ({
              id: a.id,
              platform: "tracker",
              company: a.company,
              role: a.role,
              jobUrl: a.jobUrl ?? "",
              jobDescription: "",
              appliedAt: a.createdAt,
              status: a.status.toLowerCase() as import("@/lib/autoapply-types").ApplicationStatus,
              answers: {},
            }));
          return mapped.length ? [...mapped, ...prev] : prev;
        });
      })
      .catch(() => {});

    // Listen for live updates pushed by the Chrome extension
    const onNewApp = (e: Event) => {
      const app = (e as CustomEvent).detail as Application;
      setApplications((prev) => {
        if (prev.find((a) => a.id === app.id)) return prev;
        return [app, ...prev];
      });
    };

    const onProfileUpdate = (e: Event) => {
      const p = (e as CustomEvent).detail as CandidateProfile;
      setProfile(p);
    };

    window.addEventListener("autoapply:new_application", onNewApp);
    window.addEventListener("autoapply:profile_updated", onProfileUpdate);
    return () => {
      window.removeEventListener("autoapply:new_application", onNewApp);
      window.removeEventListener("autoapply:profile_updated", onProfileUpdate);
    };
  }, []);

  const saveApplications = (apps: Application[]) => {
    setApplications(apps);
    localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(apps));
  };

  const saveProfile = async (p: CandidateProfile) => {
    setProfile(p);
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(p));
    // Persist to DB (best-effort, fire and forget)
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: `${p.personal.firstName} ${p.personal.lastName}`.trim() || undefined,
          email: p.personal.email || undefined,
          phone: p.personal.phone || undefined,
          location: p.personal.location || undefined,
          linkedinUrl: p.personal.linkedinUrl || undefined,
          profileJson: p,
        }),
      });
    } catch {}
  };

  const updateApplicationStatus = (id: string, status: Application["status"]) => {
    saveApplications(applications.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const deleteApplication = (id: string) => {
    saveApplications(applications.filter((a) => a.id !== id));
    if (selectedAppId === id) setSelectedAppId(null);
  };

  const viewAnswers = (id: string) => {
    setSelectedAppId(id);
    setActiveTab("answers");
  };

  const selectedApp = applications.find((a) => a.id === selectedAppId) ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-cyan-400">
          Job Search Hub
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
          AutoApply
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Track applications, manage your profile, and review AI-generated answers — all in one place.
        </p>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Applied", value: applications.length, color: "text-zinc-700 dark:text-zinc-300" },
          { label: "In Review", value: applications.filter((a) => a.status === "reviewing").length, color: "text-amber-600 dark:text-amber-400" },
          { label: "Interviews", value: applications.filter((a) => a.status === "interview").length, color: "text-indigo-600 dark:text-cyan-400" },
          { label: "Offers", value: applications.filter((a) => a.status === "offer").length, color: "text-emerald-600 dark:text-emerald-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-zinc-200 dark:border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600 dark:border-cyan-400 dark:text-cyan-300"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "applications" && (
        <ApplicationsTab
          applications={applications}
          onStatusChange={updateApplicationStatus}
          onDelete={deleteApplication}
          onViewAnswers={viewAnswers}
        />
      )}
      {activeTab === "profile" && (
        <ProfileTab profile={profile} onSave={saveProfile} />
      )}
      {activeTab === "answers" && (
        <AnswersTab
          applications={applications}
          selectedApp={selectedApp}
          onSelect={setSelectedAppId}
        />
      )}
    </div>
  );
}
