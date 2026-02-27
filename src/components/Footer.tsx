import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-muted/50 py-10 mt-16">
    <div className="container">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg mb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-black">
              S
            </span>
            ShareKart
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Rent, sell, or donate — building community through sharing.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Marketplace</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-primary transition-colors">Browse Items</Link></li>
            <li><Link to="/list-item" className="hover:text-primary transition-colors">List an Item</Link></li>
            <li><Link to="/leaderboard" className="hover:text-primary transition-colors">Leaderboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Trust & Safety</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><span className="cursor-pointer hover:text-primary transition-colors">KYC Verification</span></li>
            <li><span className="cursor-pointer hover:text-primary transition-colors">Escrow Protection</span></li>
            <li><span className="cursor-pointer hover:text-primary transition-colors">Dispute Resolution</span></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><span className="cursor-pointer hover:text-primary transition-colors">About Us</span></li>
            <li><span className="cursor-pointer hover:text-primary transition-colors">Privacy Policy</span></li>
            <li><span className="cursor-pointer hover:text-primary transition-colors">Terms of Service</span></li>
          </ul>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-1 text-sm text-muted-foreground">
        Made with <Heart className="h-3.5 w-3.5 text-destructive fill-destructive" /> by ShareKart
      </div>
    </div>
  </footer>
);

export default Footer;
