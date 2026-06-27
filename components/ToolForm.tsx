"use client";

import { PAID_STATUSES, TOOL_CATEGORIES, TOOL_STATUSES } from "@/lib/constants";
import type { Tool, ToolCategory } from "@/lib/types";
import { toNumber } from "@/lib/utils";
import { useState } from "react";

type ToolFormValue = Omit<Tool, "id" | "createdAt" | "updatedAt">;

const defaultValue: ToolFormValue = {
  name: "",
  category: "other",
  websiteUrl: "",
  loginUrl: "",
  accountEmail: "",
  paidStatus: "unknown",
  monthlyCost: 0,
  annualCost: 0,
  billingCycle: "",
  renewalDate: "",
  status: "active",
  notes: "",
};

type ToolPreset = Pick<
  ToolFormValue,
  "name" | "category" | "websiteUrl" | "loginUrl" | "paidStatus" | "billingCycle" | "notes"
> & {
  group: string;
  annualCost?: number;
  renewalDate?: string;
};

const toolPresets: ToolPreset[] = [
  {
    group: "Development",
    name: "Visual Studio",
    category: "code",
    websiteUrl: "https://visualstudio.microsoft.com",
    loginUrl: "",
    paidStatus: "free",
    billingCycle: "none",
    notes: "Local development environment.",
  },
  {
    group: "Development",
    name: "VS Code",
    category: "code",
    websiteUrl: "https://code.visualstudio.com",
    loginUrl: "",
    paidStatus: "free",
    billingCycle: "none",
    notes: "Local development environment.",
  },
  {
    group: "Development",
    name: "GitHub",
    category: "code",
    websiteUrl: "https://github.com",
    loginUrl: "https://github.com/login",
    paidStatus: "unknown",
    billingCycle: "unknown",
    notes: "Source-code hosting tool. No account connection is configured.",
  },
  {
    group: "AI",
    name: "Codex",
    category: "AI",
    websiteUrl: "https://openai.com",
    loginUrl: "",
    paidStatus: "paid",
    billingCycle: "usage",
    notes: "AI coding assistant. Do not store secrets or tokens in StackMap.",
  },
  {
    group: "AI",
    name: "Claude",
    category: "AI",
    websiteUrl: "https://claude.ai",
    loginUrl: "https://claude.ai",
    paidStatus: "paid",
    billingCycle: "monthly",
    notes: "AI assistant used for planning, writing, or development support.",
  },
  {
    group: "AI",
    name: "ChatGPT",
    category: "AI",
    websiteUrl: "https://chatgpt.com",
    loginUrl: "https://chatgpt.com",
    paidStatus: "paid",
    billingCycle: "monthly",
    notes: "Planning, troubleshooting, and product support.",
  },
  {
    group: "AI",
    name: "OpenAI",
    category: "AI",
    websiteUrl: "https://openai.com",
    loginUrl: "https://platform.openai.com",
    paidStatus: "unknown",
    billingCycle: "usage",
    notes: "AI platform/API dependency. Do not store API keys in StackMap.",
  },
  {
    group: "Data / Backend",
    name: "Supabase",
    category: "database",
    websiteUrl: "https://supabase.com",
    loginUrl: "https://supabase.com/dashboard",
    paidStatus: "unknown",
    billingCycle: "unknown",
    notes: "Backend database/storage service.",
  },
  {
    group: "Data / Backend",
    name: "Airtable",
    category: "database",
    websiteUrl: "https://airtable.com",
    loginUrl: "https://airtable.com/login",
    paidStatus: "unknown",
    billingCycle: "unknown",
    notes: "Workspace data or operational database.",
  },
  {
    group: "Data / Backend",
    name: "IMDB",
    category: "database",
    websiteUrl: "https://www.imdb.com",
    loginUrl: "",
    paidStatus: "free",
    billingCycle: "none",
    notes: "Movie and TV reference data dependency.",
  },
  {
    group: "Hosting / Deployment",
    name: "Vercel",
    category: "hosting",
    websiteUrl: "https://vercel.com",
    loginUrl: "https://vercel.com/login",
    paidStatus: "free",
    billingCycle: "none",
    notes: "Web hosting/deployment platform.",
  },
  {
    group: "Hosting / Deployment",
    name: "Expo.dev",
    category: "hosting",
    websiteUrl: "https://expo.dev",
    loginUrl: "https://expo.dev/accounts",
    paidStatus: "unknown",
    billingCycle: "unknown",
    notes: "Mobile build/deployment service.",
  },
  {
    group: "Mobile Publishing",
    name: "Apple Developer",
    category: "app store",
    websiteUrl: "https://developer.apple.com",
    loginUrl: "https://developer.apple.com/account",
    paidStatus: "paid",
    billingCycle: "annual",
    annualCost: 99,
    renewalDate: "2026-08-31",
    notes: "iOS publishing account.",
  },
  {
    group: "Mobile Publishing",
    name: "Google Play Console",
    category: "app store",
    websiteUrl: "https://play.google.com/console",
    loginUrl: "https://play.google.com/console",
    paidStatus: "paid",
    billingCycle: "one-time",
    notes: "Android publishing account.",
  },
  {
    group: "Mobile Publishing",
    name: "RevenueCat",
    category: "payment",
    websiteUrl: "https://www.revenuecat.com",
    loginUrl: "https://app.revenuecat.com",
    paidStatus: "free",
    billingCycle: "usage",
    notes: "Subscription and in-app purchase management.",
  },
  {
    group: "Mobile Publishing",
    name: "Google AdMob",
    category: "marketing",
    websiteUrl: "https://admob.google.com",
    loginUrl: "https://admob.google.com",
    paidStatus: "free",
    billingCycle: "none",
    notes: "Ads and monetization workflow.",
  },
  {
    group: "Marketing / Design",
    name: "TikTok",
    category: "marketing",
    websiteUrl: "https://www.tiktok.com",
    loginUrl: "https://www.tiktok.com/login",
    paidStatus: "free",
    billingCycle: "none",
    notes: "Marketing channel.",
  },
  {
    group: "Marketing / Design",
    name: "Canva",
    category: "design",
    websiteUrl: "https://www.canva.com",
    loginUrl: "https://www.canva.com/login",
    paidStatus: "unknown",
    billingCycle: "unknown",
    notes: "Design or marketing asset tool.",
  },
];

const presetGroups = Array.from(new Set(toolPresets.map((preset) => preset.group)));

export function ToolForm({
  existingTools = [],
  initialValue,
  onSelectExistingTool,
  onSave,
  onCancel,
}: {
  existingTools?: Tool[];
  initialValue?: Tool;
  onSelectExistingTool?: (tool: Tool) => void;
  onSave: (value: ToolFormValue) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<ToolFormValue>(initialValue ?? defaultValue);
  const [error, setError] = useState("");
  const [presetMessage, setPresetMessage] = useState("");

  function updateValue<K extends keyof ToolFormValue>(key: K, nextValue: ToolFormValue[K]) {
    setValue((current) => ({ ...current, [key]: nextValue }));
  }

  function applyPreset(presetName: string) {
    const existingTool = existingTools.find(
      (tool) => tool.name.trim().toLowerCase() === presetName.trim().toLowerCase(),
    );
    if (existingTool) {
      if (onSelectExistingTool) {
        onSelectExistingTool(existingTool);
        return;
      }

      const existingValue: ToolFormValue = {
        name: existingTool.name,
        category: existingTool.category,
        websiteUrl: existingTool.websiteUrl,
        loginUrl: existingTool.loginUrl,
        accountEmail: existingTool.accountEmail,
        paidStatus: existingTool.paidStatus,
        monthlyCost: existingTool.monthlyCost,
        annualCost: existingTool.annualCost,
        billingCycle: existingTool.billingCycle,
        renewalDate: existingTool.renewalDate,
        status: existingTool.status,
        notes: existingTool.notes,
        source: existingTool.source,
        sourceName: existingTool.sourceName,
        sourceUrl: existingTool.sourceUrl,
        sourceVisibility: existingTool.sourceVisibility,
        primaryLanguage: existingTool.primaryLanguage,
        lastDetectedAt: existingTool.lastDetectedAt,
        lastReviewedAt: existingTool.lastReviewedAt,
      };
      setValue(existingValue);
      setPresetMessage(
        `${existingTool.name} is already in your tools. Loaded the current saved details below.`,
      );
      return;
    }

    const preset = toolPresets.find((item) => item.name === presetName);
    if (!preset) return;

    setValue((current) => ({
      ...current,
      name: preset.name,
      category: preset.category,
      websiteUrl: preset.websiteUrl,
      loginUrl: preset.loginUrl,
      paidStatus: preset.paidStatus,
      monthlyCost: 0,
      annualCost: preset.annualCost ?? 0,
      billingCycle: preset.billingCycle,
      renewalDate: preset.renewalDate ?? "",
      notes: preset.notes,
      status: "active",
    }));
    setPresetMessage("");
  }

  return (
    <form
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = String(formData.get("name") ?? "").trim();
        const monthlyCost = toNumber(formData.get("monthlyCost"));
        const annualCost = toNumber(formData.get("annualCost"));
        if (!name) {
          setError("Tool name is required.");
          return;
        }
        if (monthlyCost < 0 || annualCost < 0) {
          setError("Costs cannot be negative.");
          return;
        }
        setError("");
        onSave({
          name,
          category: String(formData.get("category") ?? "other") as ToolFormValue["category"],
          websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
          loginUrl: String(formData.get("loginUrl") ?? "").trim(),
          accountEmail: String(formData.get("accountEmail") ?? "").trim(),
          paidStatus: String(formData.get("paidStatus") ?? "unknown") as ToolFormValue["paidStatus"],
          monthlyCost,
          annualCost,
          billingCycle: String(formData.get("billingCycle") ?? "").trim(),
          renewalDate: String(formData.get("renewalDate") ?? ""),
          status: String(formData.get("status") ?? "active") as ToolFormValue["status"],
          notes: String(formData.get("notes") ?? "").trim(),
        });
      }}
    >
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Tool records store details like login, cost, renewal, and status. Add relationship labels
        like uses, built with, deploys to, and publishes to from the Relationships page.
      </p>
      {!initialValue ? (
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Common tool
          <select
            defaultValue=""
            onChange={(event) => applyPreset(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          >
            <option value="">Custom tool</option>
            {presetGroups.map((group) => (
              <optgroup key={group} label={group}>
                {toolPresets
                  .filter((preset) => preset.group === group)
                  .map((preset) => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <span className="text-xs font-normal text-slate-500">
            Presets use names and categories recognized by the Relationship Builder. You can edit
            any field before saving.
          </span>
          {presetMessage ? (
            <span className="rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              {presetMessage}
            </span>
          ) : null}
        </label>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Name
          <input
            name="name"
            required
            value={value.name}
            onChange={(event) => updateValue("name", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Category
          <select
            name="category"
            value={value.category}
            onChange={(event) => updateValue("category", event.target.value as ToolCategory)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          >
            {TOOL_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Status
          <select
            name="status"
            value={value.status}
            onChange={(event) => updateValue("status", event.target.value as ToolFormValue["status"])}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          >
            {TOOL_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Website URL
          <input
            name="websiteUrl"
            value={value.websiteUrl}
            onChange={(event) => updateValue("websiteUrl", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Login URL
          <input
            name="loginUrl"
            value={value.loginUrl}
            onChange={(event) => updateValue("loginUrl", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Account Email
          <input
            name="accountEmail"
            type="email"
            value={value.accountEmail}
            onChange={(event) => updateValue("accountEmail", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Paid Status
          <select
            name="paidStatus"
            value={value.paidStatus}
            onChange={(event) => updateValue("paidStatus", event.target.value as ToolFormValue["paidStatus"])}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          >
            {PAID_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Monthly Cost
          <input
            name="monthlyCost"
            type="number"
            step="0.01"
            min="0"
            value={value.monthlyCost}
            onChange={(event) => updateValue("monthlyCost", Number(event.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Annual Cost
          <input
            name="annualCost"
            type="number"
            step="0.01"
            min="0"
            value={value.annualCost}
            onChange={(event) => updateValue("annualCost", Number(event.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Billing Cycle
          <input
            name="billingCycle"
            value={value.billingCycle}
            onChange={(event) => updateValue("billingCycle", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Renewal Date
          <input
            name="renewalDate"
            type="date"
            value={value.renewalDate}
            onChange={(event) => updateValue("renewalDate", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Notes
        <textarea
          name="notes"
          rows={3}
          value={value.notes}
          onChange={(event) => updateValue("notes", event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 font-normal"
        />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Cancel
        </button>
        <button type="submit" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Save Tool
        </button>
      </div>
    </form>
  );
}
