# Context: The platform will enable dispatchers to efficiently manage vehicle relocation requests, centralizing data through a web interface connected to a proprietary REST API.

# Goal: Create a dispatcher web app with the follow features

# Features

- Feature 1:
The user should be authenticated by Google integration
The system must display a "Sign in with Google" button on the landing page

- Feature 2:
A dedicated interface for dispatchers to input new vehicle movement orders:

Input Fields & Validation:
- Origin: String 
- Destination: String 
- Execution Date: DatePicker (Must prevent selection of past dates)
- Notes: Text area (Maximum 500 characters, optional)

API endpoint: POST /api/v1/relocations

- Feature 3:
A centralized dashboard to view and track all relocation request:
- A dynamic data table with columns: ID, Origin, Destination, Date, and Status.
Status Indicators PENDING, IN_PROGRESS, COMPLETED and CANCELLED

API endpoint: GET /api/v1/relocations

- Feature 4:
Ability to modify existing data or transition the status of a request

Rules:
- Requests with status COMPLETED or CANCELLED cannot be edited.

API endpoint: PUT  /api/v1/relocations/{id}

Tech Stack:
- VueJS
- Supabase to authentication, database
- Use Prisma
- Vercel to the web app hosting and the API
- Design System Component: shadcn
- API: Typescript with the plugin of fastify