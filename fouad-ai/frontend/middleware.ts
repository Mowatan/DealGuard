import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/privacy',
  '/terms',
]);

// Define admin routes that require admin role
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher(['/deals(.*)', '/portal(.*)']);

export default clerkMiddleware(async (auth, request) => {
  // Public routes - allow everyone
  if (isPublicRoute(request)) {
    return;
  }

  // Protected routes - require authentication
  if (isProtectedRoute(request) || isAdminRoute(request)) {
    await auth.protect();
  }

  // Admin routes - additional role check can be added here if needed
  // For example: if (isAdminRoute(request)) { check admin role }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
