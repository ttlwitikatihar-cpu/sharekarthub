import StaticPage from "@/components/StaticPage";
import { Mail } from "lucide-react";

const About = () => (
  <StaticPage
    title="About ShareKart — Rent, Sell, Donate Locally"
    description="ShareKart is a community marketplace for renting, selling, and donating. Reduce waste, reuse more, and help your neighbors."
    path="/about"
    heading="About ShareKart Hub"
  >
    <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
      "What is gathering dust in your closet could be the missing piece in someone else's life.
      One person's surplus is another person's solution."
    </blockquote>

    <p>
      At ShareKart, we believe that in a world of finite resources, we need each other, and our
      planet needs us. We don't just share items; we share a collective responsibility to protect
      our environment and lift our communities up. True sustainability isn't just about throwing
      things away responsibly — it's about changing how we value what we already own.
    </p>

    <p>
      Our platform was founded on a simple truth: nothing truly loses its value, it just needs to
      find the right home. Every time you choose to recycle, reuse, and share, you are actively
      keeping the circular economy alive. ShareKart bridges the gap between what you no longer
      need and what someone else is searching for, transforming potential waste into powerful
      community utility. No item is useless; it is simply waiting for its next chapter.
    </p>

    <p>
      By creating a seamless local circle for renting, selling, and donating, we are working
      together to minimize waste, heal our society, and ensure that no neighbor goes without.
      When we reuse instead of discard, we close the loop on waste and remind each other that we
      thrive best when we share.
    </p>

    <p className="font-medium">
      Let's protect our planet, maximize our resources, and rebuild our community — one shared
      item at a time.
    </p>

    <h2 className="text-2xl font-bold mt-10 mb-3">Get in Touch</h2>
    <p>
      ShareKart Hub is headed by <strong>Kundan Kumar</strong>. For inquiries, partnerships, or
      support, feel free to reach out directly:
    </p>
    <p className="flex items-center gap-2">
      <Mail className="h-4 w-4 text-primary" />
      <a href="mailto:kundanroy3290@gmail.com" className="text-primary hover:underline">
        kundanroy3290@gmail.com
      </a>
    </p>
  </StaticPage>
);

export default About;
