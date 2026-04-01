import { Star, Clock, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { Link } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface CourseCardProps {
  id: string;
  title: string;
  instructor: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  students: number;
  duration: string;
  level: string;
  category: string;
  isBestseller?: boolean;
}

export function CourseCard({
  id,
  title,
  instructor,
  image,
  price,
  originalPrice,
  rating,
  students,
  duration,
  level,
  category,
  isBestseller,
}: CourseCardProps) {
  return (
    <Link to={`/courses/${id}`}>
      <Card className="group overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
        <div className="relative overflow-hidden aspect-video">
          <ImageWithFallback
            src={image}
            alt={title}
            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
          />
          {isBestseller && (
            <Badge className="absolute top-3 left-3 bg-accent gap-1">
              <TrendingUp className="h-3 w-3" />
              Bestseller
            </Badge>
          )}
          <Badge className="absolute top-3 right-3 bg-white/90 text-foreground">
            {category}
          </Badge>
        </div>
        <CardContent className="p-4">
          <div className="mb-2">
            <h3 className="line-clamp-2 mb-2 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">{instructor}</p>
          </div>
          <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {duration}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {students.toLocaleString()}
            </div>
            <Badge variant="outline" className="text-xs">
              {level}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold">{rating}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              ({Math.floor(students * 0.6).toLocaleString()} reviews)
            </span>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">${price}</span>
            {originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                ${originalPrice}
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
