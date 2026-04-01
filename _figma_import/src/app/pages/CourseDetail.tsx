import { useParams, Link } from "react-router";
import { Star, Clock, Users, Award, CheckCircle2, Play, ArrowLeft, Share2, Heart } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { courses } from "../data/courses";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function CourseDetail() {
  const { id } = useParams();
  const course = courses.find(c => c.id === id);

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <Link to="/courses">
          <Button>Browse Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/90 to-secondary/90 text-white">
        <div className="container mx-auto px-4 py-8">
          <Link to="/courses" className="inline-flex items-center gap-2 mb-6 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-white/20 hover:bg-white/30">{course.category}</Badge>
                <Badge className="bg-white/20 hover:bg-white/30">{course.level}</Badge>
                {course.isBestseller && (
                  <Badge className="bg-accent">Bestseller</Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-white/90 mb-6">{course.description}</p>

              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold">{course.rating}</span>
                  <span className="text-white/80">
                    ({Math.floor(course.students * 0.6).toLocaleString()} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>{course.students.toLocaleString()} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>{course.duration} total</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Award className="h-5 w-5" />
                <span>Created by <span className="font-bold">{course.instructor}</span></span>
              </div>
            </div>

            {/* Preview Card - Desktop */}
            <div className="hidden lg:block">
              <Card className="sticky top-24 overflow-hidden">
                <div className="relative aspect-video">
                  <ImageWithFallback
                    src={course.image}
                    alt={course.title}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-primary ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-3xl font-bold text-primary">${course.price}</span>
                    {course.originalPrice && (
                      <>
                        <span className="text-lg text-muted-foreground line-through">
                          ${course.originalPrice}
                        </span>
                        <Badge variant="destructive">
                          {Math.round((1 - course.price / course.originalPrice) * 100)}% OFF
                        </Badge>
                      </>
                    )}
                  </div>
                  <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 mb-3">
                    Add to Cart
                  </Button>
                  <Button variant="outline" className="w-full mb-4">
                    Buy Now
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="flex-1">
                      <Heart className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="flex-1">
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Preview Card */}
      <div className="lg:hidden sticky top-16 z-40 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">${course.price}</span>
                {course.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    ${course.originalPrice}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                Enroll Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* What You'll Learn */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">What you'll learn</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {course.whatYouLearn?.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Course Content */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">Course Content</h2>
                <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                  <span>{course.curriculum?.length} sections</span>
                  <span>•</span>
                  <span>
                    {course.curriculum?.reduce((acc, section) => acc + section.lessons, 0)} lectures
                  </span>
                  <span>•</span>
                  <span>{course.duration} total length</span>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  {course.curriculum?.map((section, index) => (
                    <AccordionItem key={index} value={`section-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between flex-1 pr-4">
                          <span className="font-bold">{section.title}</span>
                          <span className="text-sm text-muted-foreground">
                            {section.lessons} lectures • {section.duration}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-4">
                          {Array.from({ length: Math.min(3, section.lessons) }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 text-sm">
                              <Play className="h-4 w-4 text-muted-foreground" />
                              <span>Lecture {i + 1}</span>
                              <span className="ml-auto text-muted-foreground">
                                {Math.floor(Math.random() * 20) + 5}:00
                              </span>
                            </div>
                          ))}
                          {section.lessons > 3 && (
                            <p className="text-sm text-muted-foreground py-2">
                              + {section.lessons - 3} more lectures
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">Requirements</h2>
                <ul className="space-y-3">
                  {course.requirements?.map((req, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="text-primary">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Instructor */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">Instructor</h2>
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-bold">
                    {course.instructor.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">{course.instructor}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Expert Instructor in {course.category}
                    </p>
                    <div className="flex gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{course.rating} Rating</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{course.students.toLocaleString()} Students</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="hidden lg:block">
            {/* Additional Info Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold mb-4">This course includes:</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Play className="h-4 w-4 text-primary" />
                      <span>{course.duration} on-demand video</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Full lifetime access</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Access on mobile and TV</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Award className="h-4 w-4 text-primary" />
                      <span>Certificate of completion</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
