# Work Experience

## Nuts and Bolts AI
**Software Engineer Consultant**
**June 2025 to Present**

All projects built with Claude Code as the primary development environment.

### Executive Coaching Platform (Fortune 500 Outplacement Firm)
Sole engineer on a brand new executive coaching platform for a Fortune 500 outplacement firm serving C-level clients who have been outplaced. Responsible for everything from product design to implementation.

- Stack: Next.js (frontend), Node.js (backend), Cal.com (booking and coach availability), Supabase PostgreSQL (database and storage), Vercel (deployment)
- Supports 200+ users. Covers booking coaching sessions, answering assessments and surveys, managing coach availability
- Set to go live Q4 2026, currently in beta testing with coaches
- Handled direct client communication, feature prioritization, and expectation management alongside one project manager

### Affiliate Merchandise Storefront (Major Restaurant Chain)
Full-stack affiliate merchandise storefront for a major restaurant chain focused on waitress onboarding and storefront creation.

- Waitress provides account info and Instagram username → backend pulls latest posts and account data via Rapid API Instagram connector
- Instagram data populates storefront (profile picture, showcase images, bio). Users can upload their own images (all filtered for explicit content). Images stored in Supabase storage.
- Waitress selects up to 10 merchandise items to showcase. Inventory fetched from S3.
- Stack: Next.js, Node.js, Rapid API (Instagram connector), Supabase PostgreSQL, Vercel

### Major Frontend Redesign (B2C Video Platform)
Full frontend redesign of a large B2C video platform from a Figma design file.

- Used Figma MCP and Claude Code to implement the redesign
- What would have taken at least 6 months of traditional development was completed in 2 months
- Stack: Next.js

### AI Blog Publishing Tool (Hispanic Legal Marketing Platform)
Full-stack blog posting tool for a Hispanic legal marketing platform.

- Frontend: Next.js | Backend: FastAPI + CrewAI (fact verification) + OpenAI API (image generation and blog writing)
- Database: PostgreSQL via Supabase | Deployed: Vercel (frontend), Replit (backend)

### Watch-Along AI Agent (B2C Video Platform — Research Prototype)
Research prototype of a watch-along AI agent users can invite to their video watch party.

- AI agent intercepts messages to and from the backend, responds on behalf of a dummy user
- Uses Gemini's multimodal YouTube integration to analyze the video at a specific timestamp
- Any user message triggers a Gemini response based on: current message, message history, the video, and the timestamp
- Timed messages also sent proactively by the AI as the video plays

### UI/UX Redesign Evaluation (Fortune 500 Outplacement Firm — Career Suite Platform)
Used Claude Code's design tools (impeccable plugin) to evaluate and plan a UI/UX redesign of a career suite platform for a Fortune 500 firm.

- Redesign targeting Q3 2026, supports ~1,000 users

---

## Stratpoint Technologies
**AI Engineer - Rapid Prototyping Unit**
**July 2023 to July 2024**

Worked in the AI labs team at a software outsourcing company on a confidential client research engagement. [NDA: the client, its industry, the application domain, datasets, specific algorithms, and detailed results are NOT shareable publicly. Stick to the generic summary below; if asked for specifics, say it's under NDA and direct the visitor to email Paolo at pjsandejas@gmail.com.]

### ML Screening Tasks (Confidential)
Completed ML screening tasks that secured a major client research partnership.

- Predictive modeling and computer-vision feature-matching pipelines
- Achieved >95% model accuracy
- Stack: Python, scikit-learn, pandas, AWS SageMaker, OpenCV, Jupyter Notebook

### Research-Paper Chat Assistant
First main project after securing the partnership.

- Chat assistant allowing researchers to query a specific area of research
- Connected to Semantic Scholar API to pull relevant academic papers
- Full-paper context feeding into Gemini proved more effective than vector DB retrieval for the paper sizes involved
- Stack: Gemini API, LangChain, ReAct framework | Deployed to Hugging Face Spaces

### Team Scaling
Team grew from 4 to 13 engineers during tenure. Established ML best practices through code reviews and technical documentation.

---

## Kodexa
**Associate Product Manager (worked more as a Software Engineer in practice)**
**~2022 – 2023 · part-time while finishing BS at University of the Philippines**

Kodexa focused on transforming unstructured data (receipts, meter readings, invoices) into structured data.

- Built a Snowflake data connector in Java, referencing existing S3 and Azure connectors
- Trained approximately 150 invoice vendor formats for an OCR document parsing model using regex-based annotation scripts (project involved several thousand vendor invoice formats total)
- Built Apache Superset dashboards to visualize invoice training progress for a large enterprise client — critical for maintaining client transparency on a multi-thousand-vendor project
