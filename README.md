# avia! 

Welcome to **avia!**, a template-driven document generation platform. 

---

## 🔗 Live Demo

Check out the working at: [https://avia-navy.vercel.app/](https://avia-navy.vercel.app/)

---

## ✨ Features

- **Template Management**: Upload and manage your `.docx` templates with ease.
- **Dynamic Content**: Fill templates with real-time data using a sleek interface.
- **Fast & Reliable**: Powered by the latest web technologies for a seamless experience.
- **Dark Mode**: Because every pro developer loves a good dark theme. 🌙

---

## 🛠️ The Power Stack

We don't settle for "good enough." avia! is built on a rock-solid, modern stack:

- **Framework**: [Next.js 15+](https://nextjs.org/) (The foundation of speed)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/) (For that premium look and feel)
- **Database**: [Neon](https://neon.tech/) (Serverless Postgres that scales with you)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) (Type-safe and blazing fast)
- **Auth**: [Clerk](https://clerk.com/) (Security done right)
- **Icons**: [Lucide React](https://lucide.dev/) (Beautifully crafted icons)

---

## 🚀 Getting Started

Ready to take flight? Follow these steps to set up your local environment:

### 1. Clone the repository
```bash
git clone https://github.com/fernandorybka/avia.git
cd avia
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up your environment
Copy the template environment file and fill in your keys:
```bash
cp .env.example .env.local
```

You'll need to create accounts and get API keys from:
- [Clerk Dashboard](https://dashboard.clerk.com/) for authentication.
- [Neon Console](https://console.neon.tech/) for your database.

### 4. Sync your database schema
```bash
npx drizzle-kit push
```

### 5. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🎨 Branding & Colors

The **avia!** brand uses a vibrant **#ff3939** (Red/Orange) as its primary color, reflecting energy and precision. The UI is designed to be clean, responsive, and intuitive.

---

## 🗄️ Database Management

Need to tweak the data or check the schema? Use Drizzle Kit's built-in studio:
```bash
npx drizzle-kit studio
```

---

## 🤝 Contributing

We love feedback and contributions! Feel free to open an issue or submit a pull request if you have ideas to make **avia!** even better.

Built with ❤️ by [Fernando Rybka](https://github.com/fernandorybka).
