import { useParams, Link } from "react-router-dom";
import { Star, MapPin, ShieldCheck, Clock, ArrowLeft, MessageCircle, Heart, Share2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MOCK_ITEMS } from "@/lib/mockData";

const ItemDetail = () => {
  const { id } = useParams();
  const item = MOCK_ITEMS.find((i) => i.id === id);

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Item not found</h2>
            <Link to="/"><Button variant="outline">Back to Browse</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const categoryLabels = { rent: "For Rent", sale: "For Sale", donate: "Free / Donate" };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container flex-1 py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl overflow-hidden bg-muted aspect-[4/3]"
          >
            <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-5"
          >
            <div>
              <Badge variant="secondary" className="mb-2">{categoryLabels[item.category]}</Badge>
              <h1 className="text-2xl md:text-3xl font-bold">{item.title}</h1>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{item.location}</span>
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" />{item.rating} ({item.reviewCount} reviews)</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{item.condition}</span>
            </div>

            <div className="text-3xl font-black">
              {item.category === "donate" ? (
                <span className="text-primary">Free</span>
              ) : (
                <>₹{item.price.toLocaleString()}{item.category === "rent" && <span className="text-base font-normal text-muted-foreground">/day</span>}</>
              )}
            </div>

            {item.securityDeposit && (
              <p className="text-sm text-muted-foreground">
                Security deposit: <span className="font-semibold text-foreground">₹{item.securityDeposit.toLocaleString()}</span> (held in escrow)
              </p>
            )}

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>

            <Separator />

            {/* Provider */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {item.provider.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">{item.provider.name}</span>
                  {item.provider.verified && <ShieldCheck className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-accent text-accent" />
                  {item.provider.rating} rating
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 gap-2" size="lg">
                {item.category === "rent" ? "Request to Rent" : item.category === "sale" ? "Buy Now" : "Request Item"}
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <MessageCircle className="h-4 w-4" /> Chat
              </Button>
              <Button variant="ghost" size="icon"><Heart className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon"><Share2 className="h-5 w-5" /></Button>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ItemDetail;
