# Construction Sales Tracker

## Overview

Construction Sales Tracker is a comprehensive web application designed to help construction sales professionals manage and track job sites in California through an interactive mapping interface. The application integrates with Dodge Data & Analytics to automatically import thousands of California construction project data and provides tools for visualizing, filtering, and managing construction opportunities on a map-based interface.

The system features real-time job site tracking, automated data scraping from construction databases, document processing capabilities for extracting project information, and comprehensive filtering and search functionality. Users can view construction projects on an interactive map, manage equipment assignments, process uploaded documents, and track project status updates.

## User Preferences

Preferred communication style: Simple, everyday language.
Layout preferences: Sidebar should not block or overlap the map area. Fixed sidebar width with responsive map area.

## System Architecture

### Frontend Architecture

The frontend is built using React 18 with TypeScript, employing a modern single-page application architecture. The application uses Wouter for client-side routing and TanStack Query for state management and API integration. The UI is constructed with shadcn/ui components built on Radix UI primitives, providing a consistent and accessible design system.

The mapping functionality is implemented using Leaflet for interactive map visualization, with custom job pins and location-based features. The application uses React Hook Form with Zod validation for form management and data validation throughout the interface.

### Backend Architecture

The backend follows an Express.js API architecture with TypeScript, providing RESTful endpoints for job management, equipment tracking, and document processing. The server implements middleware for request logging, error handling, and file upload processing using Multer.

The application uses a service-oriented architecture with separate services for:
- Scraping service for automated data collection from Dodge Data & Analytics
- Document processor for extracting information from uploaded Word documents and text files
- Geocoding service for converting addresses to coordinates using Google Maps API
- Storage abstraction layer supporting both in-memory and database implementations

### Data Storage Solutions

The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The database schema includes tables for jobs, equipment, documents, and users with appropriate relationships and constraints.

Database connection is handled through Neon serverless PostgreSQL with connection pooling for optimal performance. The storage layer implements an abstract interface allowing for future database migrations or testing with in-memory storage.

### Authentication and Authorization

The current implementation focuses on data management without complex authentication, designed for single-user or trusted environment usage. The user system is prepared for future authentication integration with basic user management capabilities.

### External Dependencies

**Dodge Data & Analytics Integration**: Automated job scraping using scheduled cron jobs (daily at 6 AM) to fetch thousands of California construction projects. The integration targets all active, planning, and bidding construction projects in California with a limit of 1000 projects per fetch and expects API credentials to be provided via environment variables.

**Google Services**: 
- Google Geocoding API for converting addresses to map coordinates and reverse geocoding
- Google Cloud Storage for file storage and document management
- Environment variables required: GOOGLE_MAPS_API_KEY, GEOCODING_API_KEY

**Mapping Services**: Leaflet with OpenStreetMap tiles for interactive map visualization, providing zoom, pan, and marker functionality without requiring API keys.

**Database Services**: Neon serverless PostgreSQL for production database hosting, with connection string provided via DATABASE_URL environment variable.

**File Processing**: Uppy.js for enhanced file upload experiences with drag-and-drop functionality and progress tracking. Document processing capabilities for Word documents and text files to extract project information.

**Development Tools**: Vite for build tooling and development server, with specialized Replit integration for cloud development environment compatibility.