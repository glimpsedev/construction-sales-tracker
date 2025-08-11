# Construction Sales Tracker

## Overview

Construction Sales Tracker is a comprehensive web application designed to help construction sales professionals manage and track job sites in California through an interactive mapping interface. The application exclusively integrates with Dodge Data & Analytics via CSV/Excel import functionality to process California construction project records and provides tools for visualizing, filtering, and managing construction opportunities on a map-based interface.

The system features comprehensive job tracking with viewed/unviewed status, note-taking capabilities, CSV/Excel import with automatic California-only filtering, document processing capabilities, and email automation for equipment management. Users can import Dodge Excel files, view construction projects on an interactive map with color-coded status indicators, mark jobs as viewed, add personal notes, manage equipment assignments, and track project status updates. The application automatically filters out non-California jobs to maintain a focused map view. Job locations are interactive - clicking on addresses or coordinates opens directions in the user's default map provider.

## User Preferences

Preferred communication style: Simple, everyday language.
Layout preferences: Sidebar should not block or overlap the map area. Fixed sidebar width with responsive map area.

## Recent Changes (January 14, 2025)

- **Dodge Data Import Enhancement**: Updated CSV import service to handle new Dodge Excel format with columns for Owner Company Name, GC Company Name, Valuation ranges, Target Start/Completion Dates, County, Delivery System, and Tags
- **Database Schema Update**: Added county field to jobs table for California county information from Dodge Data
- **UI Improvements**: Enhanced JobDetailsModal to display all new Dodge fields including County, Valuation, Target Dates, and Project Team information
- **Filter Visibility Fix**: Added prominent filter buttons in the header for both mobile and desktop views, making filters easily accessible

## System Architecture

### Frontend Architecture

The frontend is built using React 18 with TypeScript, employing a modern single-page application architecture. The application uses Wouter for client-side routing and TanStack Query for state management and API integration. The UI is constructed with shadcn/ui components built on Radix UI primitives, providing a consistent and accessible design system.

The mapping functionality is implemented using Leaflet for interactive map visualization, with custom job pins and location-based features. The application uses React Hook Form with Zod validation for form management and data validation throughout the interface.

### Backend Architecture

The backend follows an Express.js API architecture with TypeScript, providing RESTful endpoints for job management, equipment tracking, and document processing. The server implements middleware for request logging, error handling, and file upload processing using Multer.

The application uses a service-oriented architecture with separate services for:
- **CSV Import Service**: Processes Dodge Data CSV exports with intelligent duplicate detection and job merging
- **California Data Service**: Automated data collection from government APIs  
- **Document Processor**: Extracting information from uploaded Word documents and text files
- **Email Webhook Service**: Automatic Excel processing from dedicated email address
- **Geocoding Service**: Converting addresses to coordinates using Google Maps API
- **Storage Abstraction Layer**: Supporting both in-memory and database implementations

### Data Storage Solutions

The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The database schema includes tables for jobs, equipment, documents, and users with appropriate relationships and constraints.

Database connection is handled through Neon serverless PostgreSQL with connection pooling for optimal performance. The storage layer implements an abstract interface allowing for future database migrations or testing with in-memory storage.

### Authentication and Authorization

The current implementation focuses on data management without complex authentication, designed for single-user or trusted environment usage. The user system is prepared for future authentication integration with basic user management capabilities.

### External Dependencies

**Data Integration Capabilities**: The system supports multiple data sources for construction project information:
- **Dodge Data & Analytics CSV Import**: Primary data source via CSV file uploads with intelligent duplicate detection, job tracking, and user interaction features
- **California Government Open Data Integration**: Real-time construction project data from multiple official government sources including San Francisco, Los Angeles, and San Jose building permits APIs
All data sources provide authentic construction project information for California with comprehensive filtering and mapping visualization.

**Google Services**: 
- Google Geocoding API for converting addresses to map coordinates and reverse geocoding
- Google Cloud Storage for file storage and document management
- Environment variables required: GOOGLE_MAPS_API_KEY, GEOCODING_API_KEY

**Mapping Services**: Leaflet with OpenStreetMap tiles for interactive map visualization, providing zoom, pan, and marker functionality without requiring API keys.

**Database Services**: Neon serverless PostgreSQL for production database hosting, with connection string provided via DATABASE_URL environment variable.

**File Processing**: Uppy.js for enhanced file upload experiences with drag-and-drop functionality and progress tracking. Document processing capabilities for Word documents and text files to extract project information. Email webhook integration for automatic Excel file processing.

**Email Automation**: Dedicated email address for receiving Excel attachments with automatic processing pipeline. Webhook endpoints for integration with email service providers (Mailgun, SendGrid, Zapier). Equipment rental status updates via email without manual intervention.

**Development Tools**: Vite for build tooling and development server, with specialized Replit integration for cloud development environment compatibility.