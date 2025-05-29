# BalikBayani Portal – System Flow & Real-World Workflow

## System Visual Design & Theme
- **Overall Look:**
  - Clean, modern, and professional interface with a focus on usability and clarity.
  - Consistent use of white backgrounds with soft blue accents for a light and approachable feel.
- **Color Scheme:**
  - Primary: Blue (#377DFF or similar) for headers, buttons, and highlights.
  - Secondary: White backgrounds, light gray borders, and subtle shadows for depth.
  - Status indicators use soft colored pills (blue, yellow, green, red, etc.) for clarity.
- **Typography:**
  - Sans-serif font (e.g., Inter, Arial, or similar) for readability and modern appearance.
  - Bold, large font for main headers (e.g., "BalikBayani Portal").
  - Clear, legible text for table data and form fields.
- **Layout:**
  - Centered content within a card-like container with rounded corners and drop shadows.
  - Navigation bar at the top with clear section links and user profile access on the right.
  - Tables with sticky headers, alternating row backgrounds, and clear column separation.
  - Search, filter, export, and create actions are consistently placed above tables.
- **Tables:**
  - Blue header row with white text for column titles.
  - Rows are clean, with subtle hover effects for interactivity.
  - Action menus (ellipsis) for row-specific actions.
- **Modals:**
  - Centered, with rounded corners and a blue header.
  - Multi-step forms use tabbed navigation or step indicators.
  - Large, clear input fields and buttons.
- **Buttons:**
  - Primary actions use solid blue buttons with white text.
  - Secondary actions use outlined or subtle gray buttons.
- **Status/Badges:**
  - Use colored pills for status (e.g., evaluated, for confirmation, for interview) with appropriate color coding for quick recognition.
- **Responsiveness:**
  - Layout adapts to different screen sizes, maintaining usability on desktops and tablets.
- **Footer:**
  - Simple, gray text with copyright and legal notice.

## 1. Login Page
- Secure authentication for authorized personnel.
- Fields: Username, Password.
- **Register Tab:** Allows new users to register by providing required information. Registration requests must be approved by the system admin before the user can log in.
- Footer: Contact/support info, legal notice.

## 2. Dashboard
- **Landing page after login.**
- **Navigation Bar:**
  - Dashboard, Direct Hire, Balik Manggagawa (dropdown: Clearance, Processing), Gov to Gov, Information Sheet, Job Fairs, Admin/User profile.
- **Overview Tab:**
  - Summary cards (Direct Hire, Gov to Gov, Balik Manggagawa, Information Sheet) with gender filters.
  - Application timeline chart.
- **Applications Tab:**
  - Table of applications with search, time filter, status badges, and actions menu.

## 3. Direct Hire Module
- **Tabs:** Overview, Applications.
- **Applications Tab:**
  - Table: Control #, Name, Sex, Salary, Status (editable), Actions (View, Edit, Delete, Compliance Form).
  - **Create Button:** Multi-step modal form (Form 1: personal/employment info, Form 2: document uploads).
  - **Search/Filter:** Advanced filtering by type, sex, status, approval, date, jobsite, position, evaluator.
  - **Export:** PDF/Excel export of table data.
  - **Applicant Details Modal:**
    - Personal info, employment details, application status tracker, documents tab (with View, Update/Replace, Download, Delete, Merge, New).

## 4. Balik Manggagawa Module
- **Dropdown:** Clearance and Processing.
- **Clearance:**
  - Table: Control #, Name of Worker, Sex, Employer, Destination, Salary, Action.
  - **Search/Filter:** By clearance type, sex, date, jobsite, position.
  - **Create Button:** Dropdown for different clearance types, each with its own modal form (Watchlisted Employer, Seafarer's Position, Non Compliant Country, No Verified Contract, For Assessment Country, Critical Skill, Watchlisted Similar Name).
  - **Export:** PDF/Excel export.
- **Processing:**
  - Table: O.R. No., Name of Worker, Sex, Address, Destination.
  - **Counter Monitoring Table:** Counter No., Time-in (multiple), Remarks.

## 5. Gov to Gov Module
- **Tabs:** Monitoring Table.
- **Monitoring Table:**
  - Columns: Last Name, First Name, Middle Name, Sex, With Taiwan Working Experience, Action (menu).
  - **Search/Filter:** Search bar for quick filtering.
  - **Export:** Export Sheet (PDF/Excel) option.
  - **Create Button:** Opens a multi-step modal form.
- **Create Modal Form:**
  - **Step 1: Basic Information**
    - Last Name
    - First Name
    - Middle Name
    - Sex (dropdown)
    - Date of Birth (mm/dd/yyyy)
    - Age
    - Height (cm)
    - Weight (kg)
    - Educational Attainment (dropdown)
    - Present Address
    - Email Address
    - Contact No.
    - **Next** button to proceed
  - **Step 2: Other Information**
    - Passport Number
    - Passport Validity
    - ID Presented (dropdown)
    - ID Number
    - With Taiwan Work Experience (text/boolean)
    - Taiwan Work Experience (Name of company with year started and ended)
    - With Job Experience (Aside from Taiwan)
    - Name of company with year started and ended
    - **Create** button to submit
- **Data Flow:**
  - Upon form submission, the encoded data is added to the Monitoring Table and displayed in real time.
  - Actions menu (ellipsis) for each row for further management (e.g., edit, delete, view details).

## 6. Information Sheet Module
- **Dropdown Options:**
  - **Today:**
    - Displays all record requests for the current day.
    - Shows statistics: Total Request, Total Male, Total Female, Purpose breakdown, Worker Category, Requested Record.
    - **Create Button:** Opens a modal form for new record requests.
      - **Fields:**
        - Family Name
        - First Name
        - Middle Name
        - Gender
        - Jobsite
        - Name of Agency
        - Purpose (options: Employment, OWWA, Legal, Loan, VISA, Balik Manggagawa, Reduced Travel Tax, Philhealth, Others)
          - If 'Others' is selected, show a field to specify the purpose.
        - Worker Category (options: Landbased (Newhire), Rehire (Balik Manggagawa), Seafarer)
        - Requested Record (options: Information Sheet, OEC, Employment Contract)
        - Documents Presented (multi-select: Company ID, Passport, SSRB, NBI, SSS, Marriage Certificate, Birth Certificate, Authorization, Special Power of Attorney, Letter Request, Others)
          - If 'Others' is selected, show a field to specify the document.
        - Actions Taken:
          - Year
          - OFW Records Released (options: Print-Out, Copy of Original, Digital Image, Cert. of No Record)
          - No. of Records Retrieved/Printed
        - Time Received
        - Time Released
        - TOTAL PCT
        - Remarks if PCT is not met (options: Server error, Printer Error, Re-verification, Photocopy ID/Requirements, Others)
          - If 'Others' is selected, show a field to specify the remark.
      - Upon submission, the new record is added to today's list and included in the statistics.
  - **Summary:**
    - Shows a summary table for the selected month, with columns for each day and rows for:
      - Total Request, Male, Female
      - Highest PCT, Lowest PCT
      - Purpose breakdown (Employment, OWWA, Legal, Loan, VISA, BM, RTT, Philhealth, Others)
      - Worker Category (Land Based, Rehire, Seafarer)
      - Requested Records (Land Based, Rehire, Seafarer, Printed/Retrieved)
    - Data from the Today tab is aggregated and reflected in the Summary view for the month.

## 7. Job Fairs Module
- **Dropdown Options:**
  1. **List of Job Fairs**
     - Table Columns: Date, Venue, Office Head, For invitation letters (email), Contact No., Action
     - **Create Button:** Opens a modal to add a new job fair. Fields: Date, Venue, Office Head, Email for invitation, Contact No.
  2. **PESO IV-A Contact Info**
     - Table Columns: Province, PESO Office, Office Head, Email, Contact No., Action
     - **Create Button:** Opens a modal to add a new PESO IV-A contact. Fields: Province, PESO Office, Office Head, Email, Contact No.
  3. **PRAs Contact Info**
     - Table Columns: Name of PRAs, PRA Contact Person/s, Office Head, Email, Contact No., Action
     - **Create Button:** Opens a modal to add a new PRA contact. Fields: Name of PRAs, PRA Contact Person/s, Office Head, Email, Contact No.
  4. **Job Fair Monitoring Summary**
     - Table Columns: Date of Job Fair, Venue, No. of Invited Agencies, No. of Agencies with JFA, Male(Applicants), Female(Applicants), Total(Applicants), Action
     - **Create Button:** Opens a modal to add a new job fair monitoring summary. Fields: Date of Job Fair, Venue, No. of Invited Agencies, No. of Agencies with JFA, Male(Applicants), Female(Applicants), Total(Applicants)
- Each table supports search, export, and row actions (edit, delete, etc.).

## 8. User Module
- **Profile Access:**
  - Triggered when the user clicks their profile icon at the top right of the navigation bar.
  - Displays the User Profile and all registered information (e.g., name, email, role, etc.).
- **Registration Flow:**
  - Users can register via the Register tab on the Login page.
  - After registration, the account is pending approval.
  - System admin reviews and approves/rejects registration requests.
  - Only approved users can log in and access the system.

---

## 9. Real-World Agency Workflow

### Step 1: Applicant Arrives
- Staff greets applicant and determines classification:
  - **Direct Hire** (new overseas employment)
  - **Balik Manggagawa** (returning worker)

### Step 2: Staff Navigates the System
- **If Direct Hire:**
  - Staff logs in, navigates to Direct Hire, clicks Create, fills out forms, submits application.
  - Application is tracked in the Direct Hire Monitoring Table.
  - Staff can update status, manage documents, and track progress.
- **If Balik Manggagawa:**
  - Staff logs in, navigates to Balik Manggagawa, selects Clearance or Processing.
    - For Clearance: Staff chooses clearance type, fills out the form.
    - For Processing: Staff logs processing details (O.R. No., time-in, etc.).
  - Applicant's record is managed and tracked in the relevant table.

### Step 3: Ongoing Processing
- Staff can search/filter, update statuses, export reports, view/edit/delete records, and manage/merge documents.

### Step 4: Audit and Compliance
- All actions are logged for traceability.
- Staff can generate compliance forms and reports as required.

---

## 10. Key Features & Flows
- **Role-based navigation and access.**
- **Multi-step forms for data entry.**
- **Document management with upload, replace, merge, and download.**
- **Status tracking for applications and clearances.**
- **Advanced search and export capabilities.**
- **Audit trail for all critical actions.**

---

This file serves as a reference for the system's flow and real-world usage. Update as new modules or workflows are added. 