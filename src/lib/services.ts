import {
  AirVent,
  BriefcaseBusiness,
  Car,
  ChefHat,
  Droplets,
  Flame,
  Hammer,
  HeartPulse,
  Home,
  Laptop,
  Microwave,
  Refrigerator,
  Scissors,
  Sparkles,
  Tv,
  Truck,
  WashingMachine,
  Wind,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface ServiceOption {
  slug: string;
  label: string;
}

export interface ServiceCategory {
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  tint: string;
  iconTone: string;
  services: ServiceOption[];
}

const option = (label: string, slug = label) => ({
  slug: slug.toLowerCase().replace(/&/g, "and").replace(/\//g, "-").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
  label,
});

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    slug: "air-conditioner",
    label: "Air Conditioner",
    shortLabel: "AC",
    description: "Installation, repair, cooling and annual maintenance",
    icon: AirVent,
    tint: "bg-primary/10",
    iconTone: "text-primary",
    services: [
      option("Annual maintenance contract", "ac-amc"), option("Repair", "ac-repair"), option("Service", "ac-service"),
      option("Cooling problem", "ac-cooling-problem"), option("Gas leakage problem", "ac-gas-leakage"), option("Water leakage", "ac-water-leakage"),
      option("Installation", "ac-installation"), option("Un-Installation", "ac-uninstallation"), option("Relocation", "ac-relocation"),
      option("Gas charging (Top Up)", "ac-gas-charging"), option("Remote problem", "ac-remote-problem"), option("Air Conditioner Purchase", "ac-purchase"),
    ],
  },
  {
    slug: "beauty-salon",
    label: "Beauty Salon",
    shortLabel: "Beauty",
    description: "Salon, grooming, skincare and beauty services at home",
    icon: Scissors,
    tint: "bg-accent/15",
    iconTone: "text-accent",
    services: ["Waxing", "Manicure", "Pedicure", "Bleach & Dtan", "Facials and cleanups", "Classic Salon", "Salon prime", "Hair Care", "Other"].map((label) => option(label, `beauty-${label}`)),
  },
  {
    slug: "refrigerator",
    label: "Refrigerator",
    shortLabel: "Fridge",
    description: "Refrigerator repair, cooling, installation and cleaning",
    icon: Refrigerator,
    tint: "bg-primary/10",
    iconTone: "text-primary",
    services: ["Repair", "No Power", "Light Issue", "Door Issue", "Cooling Issue", "Servicing cleaning (one Time)", "Freezer Cooling Issue", "Installation", "Servicing cleaning (AMC)"].map((label) => option(label, `refrigerator-${label}`)),
  },
  {
    slug: "geyser",
    label: "Geyser",
    shortLabel: "Geyser",
    description: "Electric and gas geyser repair, heating and installation",
    icon: Flame,
    tint: "bg-accent/15",
    iconTone: "text-accent",
    services: ["Electric Geyser Repair", "Electric Geyser heating issue", "Electric Geyser power issue", "Electric Geyser Installation", "Electric Geyser Un-Installation", "Electric Geyser Shifting", "Gas geyser Repair", "Gas geyser heating issue", "Gas geyser sparking issue", "Gas geyser Shifting", "Gas geyser Un-Installation", "Gas geyser Installation"].map((label) => option(label, `geyser-${label}`)),
  },
  {
    slug: "cleaning",
    label: "Cleaning",
    shortLabel: "Cleaning",
    description: "Home, kitchen, office and deep-cleaning specialists",
    icon: Sparkles,
    tint: "bg-primary/10",
    iconTone: "text-primary",
    services: ["Home Basic cleaning", "Home Premium cleaning", "Kitchen cleaning", "Office cleaning", "Sofa cleaning", "Carpet cleaning", "Curtain / Blind Cleaning", "Bathroom cleaning", "Water Tank cleaning", "Other"].map((label) => option(label, `cleaning-${label}`)),
  },
  {
    slug: "washing-machine",
    label: "Washing Machine",
    shortLabel: "Laundry",
    description: "Washing machine repairs, installation and maintenance",
    icon: WashingMachine,
    tint: "bg-accent/15",
    iconTone: "text-accent",
    services: ["Repair", "Servicing cleaning (one Time)", "Display issue", "Water drain issue", "Tub rotation issue", "No Power issue", "Installation", "Button replace", "Servicing cleaning (AMC)"].map((label) => option(label, `washing-machine-${label}`)),
  },
  {
    slug: "microwave-oven",
    label: "Microwave Oven",
    shortLabel: "Microwave",
    description: "Microwave repair, heating, panel and cleaning services",
    icon: Microwave,
    tint: "bg-primary/10",
    iconTone: "text-primary",
    services: ["Repair", "Glass plate issue", "Plate rotation issue", "Touch panel issue", "Spark issue", "Heating issue", "Installation", "Microwave cleaning"].map((label) => option(label, `microwave-${label}`)),
  },
  {
    slug: "water-purifier",
    label: "Water Purifier",
    shortLabel: "Purifier",
    description: "RO servicing, filters, leakage, installation and shifting",
    icon: Droplets,
    tint: "bg-accent/15",
    iconTone: "text-accent",
    services: ["Servicing", "Repair", "No Power", "Filter change", "Water leakage", "Installation", "Shifting", "Un-Installation", "Tap change"].map((label) => option(label, `water-purifier-${label}`)),
  },
  {
    slug: "kitchen-chimney-appliances",
    label: "Kitchen Chimney & Appliances",
    shortLabel: "Kitchen",
    description: "Chimney, gas burner and dishwasher experts",
    icon: ChefHat,
    tint: "bg-primary/10",
    iconTone: "text-primary",
    services: ["Basic wall mounted chimney", "Island Kitchen Chimney", "Chimney AMC", "Gas Burner", "Dish Washer Service"].map((label) => option(label, `kitchen-${label}`)),
  },
];

export const STANDALONE_SERVICES: ServiceOption[] = [
  "TV Repair", "Plumber", "Carpenter", "Electrician", "Home Painter", "Civil contractor", "POP False ceiling", "Interior Designer", "Makeup Artist", "Mehndi Artist", "Computer Repair", "CCTV Camera", "Room Cooler", "Water Dispenser", "Air Cooler", "Water Cooler", "Deep Freezer", "Inverter", "Pest control", "Car Detailing", "Gardening", "Sanitization", "Fabrication", "Physiotherapy", "Vastu Shastra and Numerologist Consultant", "T-Shirt Printing", "Security Guard", "Movers and Packers", "Other",
].map((label) => option(label, `standalone-${label}`));

export const SERVICE_CATEGORY_ALIASES: Record<string, string> = {
  home: "cleaning",
  "home-services": "cleaning",
  "repairs-maintenance": "other",
  "beauty-wellness": "beauty-salon",
  "education-coaching": "other",
  "events-media": "other",
  "business-digital": "computer-repair",
  "moving-delivery": "movers-and-packers",
  "auto-outdoor": "car-detailing",
  appliance: "other",
  carpentry: "carpenter",
  beauty: "beauty-salon",
  fitness: "physiotherapy",
  tutoring: "other",
  photography: "other",
  design: "interior-designer",
  delivery: "movers-and-packers",
  automotive: "car-detailing",
  plumbing: "plumber",
  electrical: "electrician",
};

export const ALL_SERVICE_OPTIONS = [
  ...SERVICE_CATEGORIES.flatMap((category) => category.services),
  ...STANDALONE_SERVICES,
];

export const getServiceCategory = (slug?: string | null) =>
  SERVICE_CATEGORIES.find((category) => category.slug === slug);

export const getServiceOption = (slug?: string | null) => {
  if (!slug) return undefined;
  const normalized = SERVICE_CATEGORY_ALIASES[slug] ?? slug;
  return ALL_SERVICE_OPTIONS.find((service) => service.slug === normalized);
};

export const getServiceParent = (slug?: string | null) => {
  if (!slug) return undefined;
  const normalized = SERVICE_CATEGORY_ALIASES[slug] ?? slug;
  return SERVICE_CATEGORIES.find((category) => category.services.some((service) => service.slug === normalized));
};

export const getServiceCategoryLabel = (slug?: string | null) =>
  getServiceOption(slug)?.label ?? getServiceCategory(slug)?.label ?? "Other services";

export const getServiceSlugsForCategory = (slug?: string | null) => {
  const category = getServiceCategory(slug);
  return category?.services.map((service) => service.slug) ?? [];
};

export const getServiceIcon = (slug: string): LucideIcon => {
  if (slug.includes("air") || slug.includes("cooler")) return Wind;
  if (slug.includes("tv")) return Tv;
  if (slug.includes("computer") || slug.includes("cctv")) return Laptop;
  if (slug.includes("car")) return Car;
  if (slug.includes("mover")) return Truck;
  if (slug.includes("physio")) return HeartPulse;
  if (slug.includes("repair") || slug.includes("electric") || slug.includes("plumb")) return Wrench;
  if (slug.includes("interior") || slug.includes("painter") || slug.includes("civil")) return Home;
  if (slug.includes("security") || slug.includes("consult")) return BriefcaseBusiness;
  return Hammer;
};