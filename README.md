# Essentials

Essentials is a personal productivity dashboard that brings everyday tools and
useful information together in one place. It is designed to make routine
planning, reminders, and personal budgeting quick and accessible.

## What it includes

- **Daily tasks:** create, complete, and organize a personal to-do list.
- **Reminders:** schedule tasks by date and assign each one a category.
- **Financial tracking:** record income and expenses, review the balance and
  transaction history, set monthly budgets, create recurring movements and
  savings goals, and filter the history.
- **Quick tools:** generate a random number, flip a coin, and change the
  dashboard background.
- **Reference links:** browse useful resources grouped into topics such as
  basics, media, programming, social networks, and travel.
- **Personal accounts:** sign up or sign in with email and password. Supabase
  stores each account's tasks, reminders, expenses, and budgets separately, with
  Row Level Security policies restricting access to the data owner.

The frontend is built with React and Vite. Supabase provides authentication
and cloud data storage; GitHub Actions builds and deploys the site to GitHub
Pages.

Existing Supabase projects must run `supabase/add_finance_features.sql` in the
SQL Editor before saving recurring movements or savings goals.
