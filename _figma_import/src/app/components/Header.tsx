import { Search, Menu, User, BookOpen } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Link } from "react-router";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 mr-4">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            LearnHub
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 flex-1">
          <Link to="/courses" className="text-sm hover:text-primary transition-colors">
            Courses
          </Link>
          <a href="#" className="text-sm hover:text-primary transition-colors">
            Categories
          </a>
          <a href="#" className="text-sm hover:text-primary transition-colors">
            Instructors
          </a>
          <a href="#" className="text-sm hover:text-primary transition-colors">
            About
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search courses..."
              className="pl-10 bg-input-background border-0"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" className="hidden md:inline-flex">
            Log In
          </Button>
          <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            <User className="h-4 w-4 mr-2" />
            Sign Up
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
