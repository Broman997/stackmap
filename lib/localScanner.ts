import type {
  ProjectType,
  RelationshipType,
  StackMapData,
  Suggestion,
  SuggestionFieldValue,
  ToolCategory,
} from "./types";

export type LocalScanFile = {
  path: string;
  name: string;
  text: string;
};

export type LocalScanSuggestionInput = Omit<
  Suggestion,
  "id" | "status" | "createdAt" | "updatedAt"
> & {
  detectedFields: Record<string, SuggestionFieldValue>;
};

export type LocalScanResult = {
  rootName: string;
  scannedFiles: string[];
  ignoredFiles: string[];
  suggestions: LocalScanSuggestionInput[];
  skipped: Array<{ label: string; reason: string }>;
};

type ToolDetection = {
  name: string;
  category: ToolCategory;
  relationshipType: RelationshipType;
  confidence: number;
  reason: string;
  files: Set<string>;
};

type ToolRule = {
  name: string;
  category: ToolCategory;
  relationshipType: RelationshipType;
  confidence: number;
  packages?: string[];
  files?: string[];
  keywords?: string[];
};

const toolRules: ToolRule[] = [
  {
    name: "GitHub",
    category: "code",
    relationshipType: "uses",
    confidence: 0.72,
    keywords: ["github.com"],
  },
  {
    name: "Vercel",
    category: "hosting",
    relationshipType: "deploys_to",
    confidence: 0.9,
    packages: ["vercel", "@vercel/analytics", "@vercel/speed-insights"],
    files: ["vercel.json"],
  },
  {
    name: "Expo Dev",
    category: "code",
    relationshipType: "uses",
    confidence: 0.9,
    packages: ["expo", "expo-router"],
    files: ["app.json", "app.config.js", "app.config.ts", "eas.json"],
  },
  {
    name: "Supabase",
    category: "database",
    relationshipType: "stores_data_in",
    confidence: 0.92,
    packages: ["@supabase/supabase-js", "@supabase/auth-helpers-nextjs"],
    files: ["supabase/config.toml"],
    keywords: ["supabase"],
  },
  {
    name: "OpenAI",
    category: "AI",
    relationshipType: "integrates_with",
    confidence: 0.9,
    packages: ["openai", "@openai/realtime-api-beta"],
    keywords: ["openai"],
  },
  {
    name: "Claude",
    category: "AI",
    relationshipType: "integrates_with",
    confidence: 0.88,
    packages: ["@anthropic-ai/sdk"],
    keywords: ["anthropic", "claude"],
  },
  {
    name: "Airtable",
    category: "database",
    relationshipType: "integrates_with",
    confidence: 0.88,
    packages: ["airtable"],
    keywords: ["airtable"],
  },
  {
    name: "Stripe",
    category: "payment",
    relationshipType: "pays_for",
    confidence: 0.88,
    packages: ["stripe", "@stripe/stripe-js", "@stripe/react-stripe-js"],
    keywords: ["stripe"],
  },
  {
    name: "RevenueCat",
    category: "payment",
    relationshipType: "pays_for",
    confidence: 0.88,
    packages: ["react-native-purchases", "react-native-purchases-ui"],
    keywords: ["revenuecat"],
  },
  {
    name: "Firebase",
    category: "database",
    relationshipType: "stores_data_in",
    confidence: 0.88,
    packages: ["firebase", "@react-native-firebase/app"],
    files: ["firebase.json"],
    keywords: ["firebase"],
  },
  {
    name: "Sentry",
    category: "analytics",
    relationshipType: "integrates_with",
    confidence: 0.86,
    packages: ["@sentry/nextjs", "@sentry/react-native", "@sentry/react"],
    keywords: ["sentry"],
  },
  {
    name: "PostHog",
    category: "analytics",
    relationshipType: "integrates_with",
    confidence: 0.86,
    packages: ["posthog-js", "posthog-node", "posthog-react-native"],
    keywords: ["posthog"],
  },
  {
    name: "Next.js",
    category: "code",
    relationshipType: "uses",
    confidence: 0.86,
    packages: ["next"],
    files: ["next.config.js", "next.config.mjs", "next.config.ts"],
  },
  {
    name: "React Native",
    category: "code",
    relationshipType: "uses",
    confidence: 0.82,
    packages: ["react-native"],
  },
  {
    name: "Tailwind CSS",
    category: "design",
    relationshipType: "uses",
    confidence: 0.8,
    packages: ["tailwindcss"],
    files: ["tailwind.config.js", "tailwind.config.ts"],
  },
];

const targetFileNames = new Set([
  ".firebaserc",
  ".gitignore",
  "README.md",
  "readme.md",
  "package.json",
  "app.json",
  "app.config.js",
  "app.config.ts",
  "app.config.mjs",
  "app.config.cjs",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "vercel.json",
  "eas.json",
  "firebase.json",
  "netlify.toml",
  "tailwind.config.js",
  "tailwind.config.ts",
  "vite.config.js",
  "vite.config.ts",
  "wrangler.toml",
]);

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function compactName(value: string) {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

function getRootNameFromPaths(paths: string[]) {
  const path = paths[0] ?? "";
  const firstSegment = path.split("/").filter(Boolean)[0];
  return firstSegment || "Selected Project";
}

function isTargetFile(path: string) {
  const normalizedPath = path.replaceAll("\\", "/");
  const fileName = normalizedPath.split("/").pop() ?? normalizedPath;
  if (targetFileNames.has(fileName)) return true;
  return normalizedPath.endsWith("supabase/config.toml");
}

function inferProjectNameFromReadme(file: LocalScanFile | undefined) {
  if (!file) return "";
  const firstHeading = file.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));
  return firstHeading?.replace(/^#\s+/, "").trim() ?? "";
}

function parsePackageJson(text: string) {
  try {
    const parsed = JSON.parse(text) as {
      name?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      repository?: string | { url?: string };
    };
    return parsed;
  } catch {
    return null;
  }
}

function getPackageNames(packageJson: ReturnType<typeof parsePackageJson>) {
  if (!packageJson) return new Set<string>();
  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]);
}

function getPackageRepository(packageJson: ReturnType<typeof parsePackageJson>) {
  if (!packageJson?.repository) return "";
  if (typeof packageJson.repository === "string") return packageJson.repository;
  return packageJson.repository.url ?? "";
}

function getProjectType(files: LocalScanFile[], packageNames: Set<string>): ProjectType {
  const fileNames = files.map((file) => file.name);
  const combinedText = files.map((file) => file.text.toLowerCase()).join("\n");
  const hasExpo = packageNames.has("expo") || fileNames.includes("app.json");
  const hasReactNative = packageNames.has("react-native");
  const hasNext = packageNames.has("next");

  if (hasNext) return "website";
  if (hasExpo || hasReactNative) return "iOS app";
  if (fileNames.some((fileName) => fileName.startsWith("vite.config"))) return "website";
  if (combinedText.includes("website") || combinedText.includes("landing page")) return "website";
  if (combinedText.includes("ios") || combinedText.includes("app store")) return "iOS app";
  if (combinedText.includes("android") || combinedText.includes("google play")) return "Android app";
  return "other";
}

function hasExistingProject(data: StackMapData, name: string) {
  const compact = compactName(name);
  return data.projects.some((project) => compactName(project.name) === compact);
}

function hasExistingTool(data: StackMapData, name: string) {
  const compact = compactName(name);
  return data.tools.some((tool) => compactName(tool.name) === compact);
}

function hasPendingEntitySuggestion(
  data: StackMapData,
  entityType: "project" | "tool",
  name: string,
) {
  const compact = compactName(name);
  return data.suggestions.some(
    (suggestion) =>
      suggestion.status === "pending" &&
      suggestion.entityType === entityType &&
      compactName(String(suggestion.detectedFields.name ?? "")) === compact,
  );
}

function findProject(data: StackMapData, name: string) {
  const compact = compactName(name);
  return data.projects.find((project) => compactName(project.name) === compact);
}

function findTool(data: StackMapData, name: string) {
  const compact = compactName(name);
  return data.tools.find((tool) => compactName(tool.name) === compact);
}

function hasExistingRelationship(
  data: StackMapData,
  projectName: string,
  toolName: string,
  relationshipType: RelationshipType,
) {
  const project = findProject(data, projectName);
  const tool = findTool(data, toolName);
  if (!project || !tool) return false;

  return data.relationships.some(
    (relationship) =>
      relationship.fromType === "project" &&
      relationship.fromId === project.id &&
      relationship.toType === "tool" &&
      relationship.toId === tool.id &&
      relationship.relationshipType === relationshipType,
  );
}

function hasPendingRelationshipSuggestion(
  data: StackMapData,
  projectName: string,
  toolName: string,
  relationshipType: RelationshipType,
) {
  const fromName = compactName(projectName);
  const toName = compactName(toolName);
  return data.suggestions.some(
    (suggestion) =>
      suggestion.status === "pending" &&
      suggestion.entityType === "relationship" &&
      compactName(String(suggestion.detectedFields.fromName ?? "")) === fromName &&
      compactName(String(suggestion.detectedFields.toName ?? "")) === toName &&
      suggestion.detectedFields.relationshipType === relationshipType,
  );
}

function recordToolDetection(
  detections: Map<string, ToolDetection>,
  rule: ToolRule,
  reason: string,
  filePath: string,
) {
  const existing = detections.get(rule.name);
  if (existing) {
    existing.files.add(filePath);
    existing.reason = `${existing.reason}; ${reason}`;
    existing.confidence = Math.max(existing.confidence, rule.confidence);
    return;
  }

  detections.set(rule.name, {
    name: rule.name,
    category: rule.category,
    relationshipType: rule.relationshipType,
    confidence: rule.confidence,
    reason,
    files: new Set([filePath]),
  });
}

function detectTools(files: LocalScanFile[], packageNames: Set<string>) {
  const detections = new Map<string, ToolDetection>();

  files.forEach((file) => {
    const normalizedPath = file.path.replaceAll("\\", "/");
    const fileName = normalizedPath.split("/").pop() ?? normalizedPath;
    const lowerText = file.text.toLowerCase();

    toolRules.forEach((rule) => {
      if (rule.packages?.some((packageName) => packageNames.has(packageName))) {
        recordToolDetection(detections, rule, `Detected package for ${rule.name}`, file.path);
      }

      if (rule.files?.some((targetFile) => normalizedPath.endsWith(targetFile) || fileName === targetFile)) {
        recordToolDetection(detections, rule, `Detected config file for ${rule.name}`, file.path);
      }

      if (rule.keywords?.some((keyword) => lowerText.includes(keyword))) {
        recordToolDetection(detections, rule, `Detected reference to ${rule.name}`, file.path);
      }
    });
  });

  return Array.from(detections.values());
}

function detectPublishingTools(files: LocalScanFile[]) {
  const detections: ToolDetection[] = [];
  const configText = files
    .filter((file) => file.name.startsWith("app.") || file.name === "app.json")
    .map((file) => file.text.toLowerCase())
    .join("\n");

  if (configText.includes("bundleidentifier")) {
    detections.push({
      name: "Apple Developer",
      category: "app store",
      relationshipType: "publishes_to",
      confidence: 0.76,
      reason: "Detected iOS bundle identifier in app config",
      files: new Set(["app config"]),
    });
  }

  if (configText.includes("android") && configText.includes("package")) {
    detections.push({
      name: "Google Play Console",
      category: "app store",
      relationshipType: "publishes_to",
      confidence: 0.76,
      reason: "Detected Android package in app config",
      files: new Set(["app config"]),
    });
  }

  return detections;
}

export function scanLocalProject(
  files: LocalScanFile[],
  data: StackMapData,
  selectedPaths: string[] = files.map((file) => file.path),
): LocalScanResult {
  const targetFiles = files.filter((file) => isTargetFile(file.path));
  const rootName = getRootNameFromPaths(selectedPaths);
  const ignoredFiles = selectedPaths.filter(
    (path) => !targetFiles.some((file) => file.path === path),
  );
  if (!targetFiles.length) {
    return {
      rootName,
      scannedFiles: [],
      ignoredFiles,
      suggestions: [],
      skipped: [
        {
          label: rootName,
          reason:
            "No supported metadata files were found. Choose the actual project folder that contains package.json, app.json, next.config.*, vercel.json, eas.json, firebase.json, or supabase/config.toml.",
        },
      ],
    };
  }

  const packageFile = targetFiles.find((file) => file.name === "package.json");
  const readmeFile = targetFiles.find((file) => file.name.toLowerCase() === "readme.md");
  const packageJson = packageFile ? parsePackageJson(packageFile.text) : null;
  const packageNames = getPackageNames(packageJson);
  const projectName = packageJson?.name || inferProjectNameFromReadme(readmeFile) || rootName;
  const projectType = getProjectType(targetFiles, packageNames);
  const repository = getPackageRepository(packageJson);
  const suggestions: LocalScanSuggestionInput[] = [];
  const skipped: LocalScanResult["skipped"] = [];

  if (!hasExistingProject(data, projectName) && !hasPendingEntitySuggestion(data, "project", projectName)) {
    suggestions.push({
      source: "local_scan",
      entityType: "project",
      confidence: packageJson?.name ? 0.86 : 0.72,
      detectedFields: {
        name: projectName,
        type: projectType,
        status: "active",
        sourceName: rootName,
        sourceUrl: repository,
        notes: `Detected from selected local folder. Scanned ${targetFiles.length} metadata file${targetFiles.length === 1 ? "" : "s"}.`,
      },
      notes: "Detected from selected local project folder. No source code was uploaded or connected to external services.",
    });
  } else {
    skipped.push({ label: projectName, reason: "Project already exists or is already pending." });
  }

  const toolDetections = [...detectTools(targetFiles, packageNames), ...detectPublishingTools(targetFiles)];

  toolDetections.forEach((tool) => {
    const sourceFiles = Array.from(tool.files).join(", ");
    if (!hasExistingTool(data, tool.name) && !hasPendingEntitySuggestion(data, "tool", tool.name)) {
      suggestions.push({
        source: "local_scan",
        entityType: "tool",
        confidence: tool.confidence,
        detectedFields: {
          name: tool.name,
          category: tool.category,
          paidStatus: "unknown",
          status: "unknown",
          sourceName: rootName,
          sourceUrl: "",
          notes: `${tool.reason}. Source files: ${sourceFiles}.`,
        },
        notes: `${tool.reason}. Review before accepting.`,
      });
    } else {
      skipped.push({ label: tool.name, reason: "Tool already exists or is already pending." });
    }

    if (
      hasExistingRelationship(data, projectName, tool.name, tool.relationshipType) ||
      hasPendingRelationshipSuggestion(data, projectName, tool.name, tool.relationshipType)
    ) {
      skipped.push({
        label: `${projectName} ${tool.relationshipType.replaceAll("_", " ")} ${tool.name}`,
        reason: "Relationship already exists or is already pending.",
      });
      return;
    }

    suggestions.push({
      source: "local_scan",
      entityType: "relationship",
      confidence: Math.max(0.65, tool.confidence - 0.04),
      detectedFields: {
        name: `${projectName} ${tool.relationshipType.replaceAll("_", " ")} ${tool.name}`,
        fromType: "project",
        fromName: projectName,
        fromSourceUrl: repository,
        toType: "tool",
        toName: tool.name,
        toSourceUrl: "",
        relationshipType: tool.relationshipType,
        lastDetectedAt: new Date().toISOString(),
        notes: `${tool.reason}. Source files: ${sourceFiles}.`,
      },
      notes: "Detected from selected local project metadata. Accept only after matching project and tool records exist.",
    });
  });

  return {
    rootName,
    scannedFiles: targetFiles.map((file) => file.path),
    ignoredFiles,
    suggestions,
    skipped,
  };
}
