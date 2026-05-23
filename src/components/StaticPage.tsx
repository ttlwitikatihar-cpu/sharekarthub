import { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

interface StaticPageProps {
  title: string;
  description: string;
  path: string;
  heading: string;
  children: ReactNode;
}

const StaticPage = ({ title, description, path, heading, children }: StaticPageProps) => (
  <div className="min-h-screen flex flex-col">
    <SEO title={title} description={description} path={path} />
    <Navbar />
    <main className="container flex-1 py-12 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-6">{heading}</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 space-y-4 leading-relaxed">
        {children}
      </div>
    </main>
    <Footer />
  </div>
);

export default StaticPage;
