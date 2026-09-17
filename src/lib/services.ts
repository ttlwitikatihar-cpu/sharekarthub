import {
  BriefcaseBusiness,
  Camera,
  Car,
  Dumbbell,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Laptop,
  PartyPopper,
  Scissors,
  Truck,
  type LucideIcon,
} from "lucide-react";

export interface ServiceCategory {
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  tint: string;
  iconTone: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { slug: "home-services", label: "Home services", shortLabel: "Home", description: "Cleaning, plumbing, electrical and everyday help", icon: Home, tint: "bg-primary/10", iconTone: "text-primary" },
  { slug: "repairs-maintenance", label: "Repairs & maintenance", shortLabel: "Repairs", description: "Fix appliances, furniture, gadgets and more", icon: Hammer, tint: "bg-accent/15", iconTone: "text-accent" },
  { slug: "beauty-wellness", label: "Beauty & wellness", shortLabel: "Beauty", description: "At-home grooming, fitness and wellbeing", icon: HeartPulse, tint: "bg-primary/10", iconTone: "text-primary" },
  { slug: "education-coaching", label: "Education & coaching", shortLabel: "Learning", description: "Tutors, music lessons, language and coaching", icon: GraduationCap, tint: "bg-accent/15", iconTone: "text-accent" },
  { slug: "events-media", label: "Events & media", shortLabel: "Events", description: "Photography, décor, DJs and event support", icon: Camera, tint: "bg-primary/10", iconTone: "text-primary" },
  { slug: "business-digital", label: "Business & digital", shortLabel: "Digital", description: "Design, marketing, accounting and tech help", icon: Laptop, tint: "bg-accent/15", iconTone: "text-accent" },
  { slug: "moving-delivery", label: "Moving & delivery", shortLabel: "Moving", description: "Packers, movers, drivers and local delivery", icon: Truck, tint: "bg-primary/10", iconTone: "text-primary" },
  { slug: "auto-outdoor", label: "Auto & outdoor", shortLabel: "Auto", description: "Car care, bike service and outdoor support", icon: Car, tint: "bg-accent/15", iconTone: "text-accent" },
];

export const SERVICE_CATEGORY_ALIASES: Record<string, string> = {
  cleaning: "home-services",
  plumbing: "home-services",
  electrical: "home-services",
  appliance: "repairs-maintenance",
  carpentry: "repairs-maintenance",
  beauty: "beauty-wellness",
  fitness: "beauty-wellness",
  tutoring: "education-coaching",
  photography: "events-media",
  design: "business-digital",
  delivery: "moving-delivery",
  automotive: "auto-outdoor",
};

export const getServiceCategory = (slug?: string) =>
  SERVICE_CATEGORIES.find((category) => category.slug === slug);

export const getServiceCategoryLabel = (slug?: string | null) =>
  getServiceCategory(slug ?? undefined)?.label ?? "Other services";
