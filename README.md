# SiteWork Pro

please create this project fast because i have less credits and every button has tp work 3 dashboards  ahs to there and need phtos forn the main dashboard
Build my complete internship project from scratch as a production-quality, fully functional web application.

PROJECT NAME

LabourTrack – Daily Wage Labour Attendance & Payment Platform

This is a construction workforce management platform designed to help contractors manage workers, construction sites, attendance, automatic wage calculation, payments, pending dues and reports.

I want a complete working application, not just a frontend design or prototype.CORE TECHNOLOGY

Use:

React

TypeScript

Tailwind CSS

Supabase database

Supabase authentication

Recharts or an appropriate charting library

React Router

Modern component architecture

Responsive design

Keep the architecture clean and maintainable.

PROJECT OBJECTIVE

The platform should solve real problems faced by construction contractors:

Manual attendance management

Attendance calculation errors

Incorrect daily wage calculations

Difficulty managing workers across multiple sites

Difficulty tracking payments

Pending wage disputes

Lack of payment transparency

Difficulty preparing reports

Lack of centralized workforce information

Main workflow:

Contractor → Sites → Workers → Worker Assignment → Attendance → Automatic Wage Calculation → Payments → Pending Dues → Reports & Analytics

USER ROLES

Implement three roles.

1. ADMIN

Admin can monitor the entire platform.

Admin can:

View contractors

View workers

View sites

View attendance

View payment activity

Monitor pending wages

View system analytics

Activate/deactivate users

Access reports

Admin should have a powerful analytics dashboard.

2. CONTRACTOR

Contractor can manage only their own:

Sites

Workers

Worker assignments

Attendance

Wages

Payments

Reports

Contractors must never be able to access another contractor's data.

3. WORKER

Worker has a read-only dashboard.

Worker can see:

Own profile

Own attendance

Own earnings

Own payments

Own pending amount

Current/previous site information

Worker cannot:

Edit attendance

Record payments

Change wage

Modify site

Access another worker's data

AUTHENTICATION

Implement proper authentication.

Features:

Login

Registration

Logout

Protected routes

Role-based routing

Session persistence

Password reset if supported

Authentication error handling

After login:

Admin → Admin Dashboard

Contractor → Contractor Dashboard

Worker → Worker Dashboard

Create secure role-based database access policies.

DATABASE DESIGN

Create a clean relational database schema.

profiles / users

Fields:

id

full_name

email

phone

role

status

avatar_url if useful

created_at

updated_at

Roles:

admin

contractor

worker

sites

Fields:

id

contractor_id

site_name

location

description

start_date

end_date

status

created_at

updated_at

Status:

Active

Completed

Inactive

workers

Fields:

id

contractor_id

name

phone

email

role

daily_wage

address

joining_date

status

created_at

updated_at

Worker roles:

Mason

Labourer

Electrician

Plumber

Painter

Carpenter

Welder

Other

worker_site_assignments

Fields:

id

worker_id

site_id

contractor_id

assigned_date

end_date

status

created_at

This allows workers to be assigned to different construction sites.

attendance

Fields:

id

worker_id

site_id

contractor_id

attendance_date

status

wage_amount

marked_by

created_at

updated_at

Status:

Present

Half Day

Absent

Prevent duplicate attendance for the same worker, site and date.

payments

Fields:

id

worker_id

contractor_id

amount

payment_method

payment_date

notes

recorded_by

created_at

updated_at

Payment methods:

Cash

UPI

Bank Transfer

Other

Phase 1 only records payments.

Do NOT implement an actual payment gateway.

SECURITY / DATA ACCESS

Implement proper row-level database security.

Rules:

Admin

Can view/manage platform-wide data according to admin permissions.

Contractor

Can access only records belonging to that contractor.

Worker

Can access only their own profile, attendance, earnings and payments.

Do not trust contractor/user IDs supplied by the client when the authenticated user identity can be used.

Do not expose sensitive information.

HIGH-QUALITY UI REQUIREMENT

This is VERY IMPORTANT.

Do NOT create a basic/simple CRUD-looking interface.

The application should look like a premium modern workforce-management SaaS platform.

Design quality should be suitable for:

Internship presentation

College project demonstration

Professional portfolio

Real-world prototype

Use a polished visual system with:

Modern sidebar

Elegant top navigation

Beautiful dashboard cards

Excellent spacing

Strong typography hierarchy

Professional icons

Subtle gradients where appropriate

Soft shadows

Rounded cards

Interactive hover states

Smooth transitions

Micro-animations

Skeleton loading states

Empty states

Toast notifications

Confirmation dialogs

Professional tables

Responsive charts

Status badges

Search/filter controls

Modern forms

Modal/drawer interactions

Avoid making every section look like a simple rectangular box.

Create visual hierarchy and varied layouts.

DESIGN LANGUAGE

Use a sophisticated construction/workforce SaaS aesthetic.

Suggested visual direction:

Deep professional primary color

Neutral background

White/elevated cards

Strong typography

Subtle accent colors

Clear success/warning/danger states

Consistent iconography

Do not overuse colors.

Do not make it childish or overly flashy.

The result should look premium, professional and modern.

RESPONSIVE DESIGN

The application must work beautifully on:

Desktop

Laptop

Tablet

Mobile

Desktop should have an excellent sidebar/dashboard layout.

Mobile should use:

Collapsible navigation

Responsive cards

Mobile-friendly tables

Bottom actions where useful

Large attendance controls

LOGIN PAGE

Create a premium login experience.

Include:

Professional branding

LabourTrack logo/mark

Email

Password

Show/hide password

Remember/session behavior where appropriate

Forgot password

Login loading state

Error handling

Use a split-screen or visually rich layout rather than a plain centered form.

CONTRACTOR DASHBOARD

Create the strongest dashboard in the application.

Top section:

Good morning, [Contractor Name]

Show today's date and useful quick actions.

Quick actions:

Add Worker

Add Site

Mark Attendance

Record Payment

KPI CARDS

Create beautiful interactive cards:

Total Workers

Show:

Total workers

Active workers

Change/trend where meaningful

Active Sites

Today's Attendance

Show:

Present

Half Day

Absent

Total Earnings

Total Paid

Pending Payments

Cards should have:

Icons

Trends

Supporting text

Hover animation

Click-through navigation

ATTENDANCE ANALYTICS

Create a beautiful chart section.

Weekly attendance chart:

Present

Half Day

Absent

Allow:

Weekly

Monthly

Switching.

Use appropriate chart types.

WAGE & PAYMENT ANALYTICS

Create a professional financial analytics section.

Show:

Total wages

Total paid

Pending amount

Use a visually strong chart.

Include:

Paid

Pending

Earnings trend

SITE PERFORMANCE

Create a site overview section.

For every site show:

Site name

Location

Workers

Today's attendance

Total wages

Pending amount

Status

Use cards/table hybrid layout.

RECENT PAYMENTS

Show:

Worker

Amount

Payment method

Date

Status

Use professional transaction-style UI.

PENDING PAYMENTS

Create a visually important pending dues section.

Show:

Worker

Total earned

Total paid

Pending

Last payment date

Add a "View Details" action.

SITE MANAGEMENT

Create a beautiful site management page.

Features:

Search

Filter

Add Site

Edit Site

View Site

Complete Site

Deactivate Site

Site cards should show:

Site name

Location

Status

Worker count

Start date

End date

Wage summary

Create a detailed site page with:

Site information

Assigned workers

Attendance summary

Wage summary

Payment summary

WORKER MANAGEMENT

Create a premium worker management page.

Include:

Search workers

Role filter

Site filter

Status filter

Add Worker

Edit Worker

View Worker

Deactivate Worker

Use a polished table with:

Avatar/initial

Worker name

Role

Site

Daily wage

Attendance

Earnings

Status

Actions

Add pagination if needed.

ADD WORKER FORM

Fields:

Name

Phone

Email

Role

Daily Wage

Address

Joining Date

Site

Status

Use excellent validation and form UX.

WORKER PROFILE

Create a detailed worker profile page.

Header:

Worker avatar

Name

Role

Current site

Status

Daily wage

Stats:

Present days

Half days

Absent days

Total earned

Total paid

Pending

Tabs:

Overview

Attendance

Earnings

Payments

Make this page visually impressive.

ATTENDANCE PAGE

This should be one of the easiest and best-designed pages.

Top controls:

Site selector

Date selector

Search worker

Then show workers in a clean attendance interface.

Each worker should have three clear actions:

Present

Half Day

Absent

Use strong visual status states.

Include:

Save attendance

Edit attendance

Attendance history

Date filtering

Site filtering

Worker filtering

Show today's attendance summary at the top:

Present | Half Day | Absent

Prevent duplicate records.

WAGE CALCULATION PAGE

Create a financial-style wage page.

Show:

Worker

Daily wage

Present days

Half days

Absent days

Total earned

Total paid

Pending

Filters:

Daily

Weekly

Monthly

Custom date range

Site

Worker

Calculation:

Present = 1 × daily wage

Half Day = 0.5 × daily wage

Absent = 0

Total Wage =
(Present Days × Daily Wage)
+
(Half Days × Daily Wage × 0.5)

Pending =
Total Wage - Total Paid

The important calculations should be derived from real database records.

PAYMENT TRACKING

Create a professional payment/transaction page.

Top summary:

Total earned

Total paid

Total pending

Payment table:

Worker

Amount

Payment method

Date

Notes

Recorded by

Actions:

Record payment

View payment

Edit payment

Delete payment where permitted

Payment method:

Cash

UPI

Bank Transfer

Other

Do not process actual payments.

WORKER DASHBOARD

Create a beautiful worker-focused dashboard.

Header:

"Welcome, [Worker Name]"

Cards:

Today's attendance

Days present

Total earnings

Total paid

Pending

Charts:

Monthly attendance

Monthly earnings

Sections:

Attendance history

Earnings history

Payment history

Keep worker access strictly read-only.

ADMIN DASHBOARD

Create an advanced admin analytics dashboard.

Top KPI cards:

Total Contractors

Total Workers

Total Sites

Active Sites

Today's Attendance

Total Attendance Records

Total Payments

Total Pending Wages

Analytics:

Workforce Growth

Contractor/worker trends

Attendance Analytics

Present/Half Day/Absent trends

Payment Analytics

Paid vs pending

Site Analytics

Active/completed sites

Top Contractors

Based on workforce/activity

Use charts and visual analytics.

Do not overload the screen.

Use a professional dashboard grid.

ADMIN MANAGEMENT

Create:

Contractor Management

Search

Filter

View

Activate

Deactivate

Contractor details

Worker Overview

Search

Filter

View

Site Overview

Search

Filter

View

System Reports

REPORTS

Create a dedicated professional Reports section.

Reports:

Attendance Report

Wage Report

Payment Report

Pending Dues Report

Worker History

Site Summary

Filters:

Date range

Contractor

Site

Worker

Status

Provide:

Print-friendly report

CSV export

PDF-friendly layout if practical

SEARCH AND FILTER EXPERIENCE

Make filtering polished.

Use:

Search bars

Dropdowns

Date range picker

Status filters

Clear filters

Active filter indicators

Do not make filters visually cluttered.

NOTIFICATIONS

Add a notification system in the UI where useful.

Examples:

Attendance saved

Worker added

Payment recorded

Site created

Payment pending

Validation error

Use toast notifications.

EMPTY STATES

Every page should have useful empty states.

Examples:

"No workers added yet"

"Create your first worker to start tracking attendance."

Include an action button.

Do not leave blank white screens.

LOADING STATES

Use:

Skeleton cards

Skeleton tables

Button loading states

Page loading indicators

Avoid sudden content jumps.

ERROR HANDLING

Handle:

Network errors

Authentication errors

Database errors

Invalid forms

Duplicate attendance

Missing worker/site

Invalid payment amount

Unauthorized access

Show user-friendly messages.

DATA VALIDATION

Validate:

Required fields

Email

Phone

Daily wage

Payment amount

Dates

Worker/site selection

Prevent negative wages/payments.

DEMO DATA

Provide realistic development/demo data through the database.

Include:

Several contractors

Multiple construction sites

Multiple workers

Different worker roles

Attendance records

Wage calculations

Payment records

Do NOT hard-code demo values into dashboard components.

Use real database records.

PERFORMANCE

Keep the application fast.

Use:

Efficient database queries

Proper filtering

Pagination where appropriate

Avoid unnecessary re-renders

Reusable components

Lazy loading for large pages where useful

Do not add unnecessary libraries.

COMPONENT ARCHITECTURE

Create reusable components for:

Dashboard cards

Charts

Tables

Status badges

Search/filter bars

Forms

Modals

Confirm dialogs

Toasts

Empty states

Loading skeletons

Sidebar

Header

Avoid duplicating code.

PROJECT NAVIGATION

Create role-specific navigation.

Contractor

Dashboard
Sites
Workers
Attendance
Wages
Payments
Reports
Profile

Worker

Dashboard
My Attendance
My Earnings
My Payments
Profile

Admin

Dashboard
Contractors
Workers
Sites
Attendance
Payments
Reports
Analytics
Settings

QUICK ACTIONS

Contractor dashboard should provide:

+ Add Worker

+ Add Site

✓ Mark Attendance

₹ Record Payment

These should navigate directly to the appropriate workflow.

PHASE 1 EXCLUSIONS

Do NOT implement:

IoT

Sensors

Biometrics

Face recognition

GPS tracking

Blockchain

AI/ML

Actual payment gateway

UPI transaction processing

Government API integration

Native mobile app

These can be mentioned only as future enhancements.

FUTURE ENHANCEMENTS

Document separately:

Mobile application

QR/biometric attendance

Actual digital payments

SMS/WhatsApp notifications

Multi-language support

AI-based attendance anomaly detection

Government compliance integration

Advanced workforce analytics

Do not implement these now.

FINAL QUALITY REQUIREMENT

Before considering the project complete, verify the entire real workflow:

Register/Login
↓
Contractor Dashboard
↓
Create Site
↓
Add Worker
↓
Assign Worker
↓
Mark Attendance
↓
Automatic Wage Calculation
↓
Record Payment
↓
Pending Amount Updates
↓
Dashboard Analytics Updates
↓
Reports

Every step must use real persistent database data.

VERY IMPORTANT FOR IMPLEMENTATION SPEED

I have limited AI/build credits.

Therefore:

Start building immediately.

Do not spend credits giving me long explanations.

Do not repeatedly ask for confirmation.

Do not create unnecessary features.

Do not rewrite working code unnecessarily.

Prioritize actual implementation.

Fix errors directly when possible.

Keep the implementation efficient.

Build the major functionality first, then polish the UI.

Avoid unnecessary dependencies.

However, do not sacrifice UI quality.

The final application must be both:

FULLY FUNCTIONAL + HIGH QUALITY UI

I want this to look like a polished professional SaaS product, not a basic college CRUD application.

Start implementation now.
please

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bd9c90ca-7687-4d95-842e-6140332de643).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
