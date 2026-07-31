# 🚀 UnfilteredTech AI Studio

An AI-powered SaaS application for creating, managing, and improving social media content using **Google Gemini AI**.

Built with **Next.js 15**, **React 19**, **TypeScript**, **Prisma**, **Supabase**, **Tailwind CSS v4**, and **shadcn/ui**.

---

# ✨ Features

## 🔐 Authentication

- User authentication
- Protected dashboard
- Session management

---

## 🎨 Brand Kit

Create reusable brand identities.

### Includes

- Brand Name
- Brand Voice
- Writing Style
- Target Audience
- CTA
- Keywords
- Avoid Words

Complete CRUD supported.

---

## 📁 Projects

Organize content into projects.

Each project supports

- Name
- Description
- Brand Kit
- Created Date

Complete CRUD.

---

## 🤖 AI Studio

Generate social media content using Gemini AI.

Workflow

```
Project
      ↓
Prompt
      ↓
Gemini AI
      ↓
Generated Content
      ↓
Save
```

---

## 📝 Creations

Every generated piece of content is stored.

Each Creation contains

- Title
- Caption
- Prompt
- Project
- Content Type
- Created Date

---

## 📄 Creation Details

Each saved creation has its own page.

Includes

- Caption
- Prompt Used
- Copy Caption
- Edit
- AI Assistant

---

# 🤖 AI Assistant

Users can improve existing content using Gemini AI.

Quick Actions

- ✂️ Shorter
- 😂 Funny
- 🚀 Better Hook
- 💼 Professional
- 📱 Instagram
- 💼 LinkedIn

Users can also enter custom prompts.

Example

```
Make it shorter

Add more humor

Rewrite for LinkedIn

Use a professional tone

Make this viral
```

---

# 💬 AI Chat

Conversation format

```
User

↓

Gemini Response
```

Supports markdown rendering using

- react-markdown
- remark-gfm

---

# ✅ Accept Rewrite

Users can accept AI-generated rewrites.

Workflow

```
Original Caption

↓

AI Rewrite

↓

Accept Rewrite

↓

PATCH Database

↓

Refresh Page

↓

Updated Caption
```

---

# 🏗 Tech Stack

## Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui

---

## Backend

- Next.js Route Handlers
- Prisma ORM
- Supabase PostgreSQL

---

## AI

Google Gemini

- Content Generation
- Content Rewrite
- Prompt Engineering

---

# 📂 Project Structure

```
app/
│
├── (dashboard)/
│   ├── studio/
│   ├── projects/
│   ├── brand-kit/
│   ├── history/
│   └── creations/
│
├── api/
│   ├── generate/
│   ├── rewrite/
│   ├── creations/
│   └── projects/
│
components/
│
├── ai-studio/
├── brand-kit/
├── projects/
├── ui/
│
lib/
│
├── prisma.ts
├── gemini.ts
└── utils.ts
```

---

# ⚙️ Environment Variables

Create a `.env` file.

```env
DATABASE_URL=

DIRECT_URL=

NEXTAUTH_SECRET=

NEXTAUTH_URL=

GOOGLE_API_KEY=
```

---

# 📦 Installation

Clone repository

```bash
git clone <repo-url>
```

Install packages

```bash
npm install
```

Generate Prisma Client

```bash
npx prisma generate
```

Run migrations

```bash
npx prisma migrate dev
```

Start development server

```bash
npm run dev
```

---

# 🤖 AI Endpoints

## Generate Content

```
POST /api/generate
```

Body

```json
{
  "prompt": "",
  "contentType": "",
  "projectId": ""
}
```

---

## Rewrite Content

```
POST /api/rewrite
```

Body

```json
{
  "content": "",
  "instruction": ""
}
```

Returns

```json
{
  "data": "rewritten content"
}
```

---

## Save Creation

```
POST /api/creations
```

Returns

```json
{
  "success": true,
  "id": "creationId"
}
```

---

## Update Creation

```
PATCH /api/creations/:id
```

Updates

- Caption

---

# 📌 Current Workflow

```
Brand Kit
      ↓
Projects
      ↓
AI Studio
      ↓
Generate
      ↓
Save
      ↓
Creation Details
      ↓
AI Assistant
      ↓
Rewrite
      ↓
Accept Rewrite
      ↓
Updated Caption
```

---

# 🚧 Roadmap

### ✅ Completed

- Authentication
- Dashboard
- Brand Kit CRUD
- Projects CRUD
- AI Studio
- Gemini Content Generation
- Save Creations
- Creation Details
- AI Rewrite Chat
- Accept Rewrite

---

### 🔜 Planned

- Manual Caption Editor
- Version History
- AI Image Generation
- Social Media Publishing
- Content Calendar
- Analytics Dashboard
- Team Collaboration
- Approval Workflow
- Multi-Brand Support

---

# 🛠 Built With

- Next.js
- React
- TypeScript
- Prisma
- Supabase
- Google Gemini
- Tailwind CSS
- shadcn/ui

---

# 📄 License

This project is for educational and portfolio purposes unless otherwise specified.

---

## 👨‍💻 Author

**Harsh Bhanushali**

Building an AI-powered platform to streamline social media content creation with modern web technologies and Generative AI.