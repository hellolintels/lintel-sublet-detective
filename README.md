
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/e4221dd2-a0c7-4337-a907-b825d2c03645

## Deployment Strategy

This project uses a dual-branch strategy:
- `test-env`: For development and testing of new features (Updated: May 1, 2025 - Test Update)
- `main`: Production branch, only updated after approval...

### Deployment Hooks

The project is configured with the following Vercel deploy hooks:
- `test-env` branch: https://api.vercel.com/v1/integrations/deploy/prj_VyxsOHe5OnNHCZuVvoIBnXof0taC/VIR[...] 

## How can I edit this code?

There are several ways of editing your application...

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e4221dd2-a0c7-4337-a907-b825d2c03645) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e4221dd2-a0c7-4337-a907-b825d2c03645) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

Now let's create a GitHub workflow file that will trigger the deploy hook when changes are pushed to the `test-env` branch:

<lov-write file_path=".github/workflows/deploy-test-env.yml">
name: Deploy Test Environment

on:
  push:
    branches:
      - test-env

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Deployment
        run: |
          curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_VyxsOHe5OnNHCZuVvoIBnXof0taC/VIR[...]"
          <!-- Trigger deploy-main.yml workflow -->
