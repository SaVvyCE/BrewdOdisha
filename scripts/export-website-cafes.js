const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const htmlPath = path.join(rootDir, "frontend", "brewdodisha.html");
const importedPath = path.join(rootDir, "frontend", "bbsr_cafes.json");
const outputJsonPath = path.join(rootDir, "data", "website-cafes-complete.json");
const outputCsvPath = path.join(rootDir, "data", "website-cafes-complete.csv");

function simplifyCafeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join(" | ") : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function loadCuratedCafes() {
  const html = fs.readFileSync(htmlPath, "utf8");
  const match = html.match(/let cafesData = \[(.*?)\n  \];/s);
  if (!match) {
    throw new Error("Could not find embedded cafesData in frontend/brewdodisha.html");
  }

  return Function(`return [${match[1]}\n]`)();
}

function normalizeCuratedCafe(cafe, websiteId) {
  return {
    website_id: websiteId,
    source_type: "curated",
    original_id: cafe.id,
    name: cafe.name,
    area: cafe.area ?? null,
    address: null,
    rating: cafe.rating ?? null,
    rating_count: null,
    hours: cafe.timings ?? null,
    phone: null,
    price: cafe.price ?? null,
    vibe: Array.isArray(cafe.vibe) ? cafe.vibe : cafe.vibe ? [cafe.vibe] : [],
    best_for: Array.isArray(cafe.bestFor) ? cafe.bestFor : [],
    snippet: cafe.snippet ?? null,
    about: cafe.about ?? null,
    lat: null,
    lng: null,
    image_count: Array.isArray(cafe.images) ? cafe.images.length : 0,
    source_label: cafe.sourceLabel ?? "Curated website entry",
    source_url: cafe.sourceUrl ?? null,
  };
}

function normalizeImportedCafe(entry, websiteId) {
  return {
    website_id: websiteId,
    source_type: "imported",
    original_id: entry.id,
    name: entry.name,
    area: entry.area ?? null,
    address: entry.address ?? null,
    rating: entry.rating ?? null,
    rating_count: entry.rating_count ?? null,
    hours: entry.hours ?? null,
    phone: entry.phone ?? null,
    price: null,
    vibe: entry.vibe ? [entry.vibe] : [],
    best_for: [],
    snippet: null,
    about: null,
    lat: entry.lat ?? null,
    lng: entry.lng ?? null,
    image_count: 0,
    source_label: "Imported Bhubaneswar cafe dataset",
    source_url: entry.place_id
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${entry.name} ${entry.area} Bhubaneswar`
        )}`
      : null,
  };
}

function buildDataset() {
  const curated = loadCuratedCafes();
  const imported = JSON.parse(fs.readFileSync(importedPath, "utf8"));

  const curatedNames = curated.map((cafe) => simplifyCafeName(cafe.name));
  const importedAdditions = imported.filter((entry) => {
    const incoming = simplifyCafeName(entry.name);
    return (
      incoming &&
      !curatedNames.some(
        (existing) =>
          existing === incoming ||
          existing.includes(incoming) ||
          incoming.includes(existing)
      )
    );
  });

  const cafes = [
    ...curated.map((cafe, index) => normalizeCuratedCafe(cafe, index + 1)),
    ...importedAdditions.map((entry, index) =>
      normalizeImportedCafe(entry, curated.length + index + 1)
    ),
  ];

  return {
    generated_at: new Date().toISOString(),
    source_files: [
      "frontend/brewdodisha.html",
      "frontend/bbsr_cafes.json",
    ],
    total_cafes: cafes.length,
    cafes,
  };
}

function buildCsv(cafes) {
  const headers = [
    "website_id",
    "source_type",
    "original_id",
    "name",
    "area",
    "address",
    "rating",
    "rating_count",
    "hours",
    "phone",
    "price",
    "vibe",
    "best_for",
    "snippet",
    "about",
    "lat",
    "lng",
    "image_count",
    "source_label",
    "source_url",
  ];

  const rows = cafes.map((cafe) =>
    headers.map((header) => csvEscape(cafe[header])).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

const dataset = buildDataset();
fs.writeFileSync(outputJsonPath, `${JSON.stringify(dataset, null, 2)}\n`);
fs.writeFileSync(outputCsvPath, `${buildCsv(dataset.cafes)}\n`);

console.log(
  `Exported ${dataset.total_cafes} website cafes to data/website-cafes-complete.json and data/website-cafes-complete.csv`
);
