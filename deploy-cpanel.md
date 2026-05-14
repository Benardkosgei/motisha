Deployment Steps
Upload Files to cPanel:

Connect to your cPanel via FTP (File Manager or FTP client)
Upload the entire standalone folder contents to your Node.js application directory (usually something like ~/nodeapp or the directory you specified when creating the Node.js app)
Also upload the public folder from your project root to the same Node.js app directory
Configure Node.js App in cPanel:

Go to Software → Setup Node.js App in cPanel
Select your existing Node.js application
Ensure Node.js Version is 18 or higher (Next.js 14 requires Node 18+)
Application Root: Should point to the directory where you uploaded the files
Application URL: Your domain or subdomain
Application Startup File: server.js
Environment Variables: Add these:
NEXT_PUBLIC_SUPABASE_URL = your Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY = your Supabase anon key
Install Dependencies (if not automatic):

In cPanel Node.js manager, there should be a "Run NPM Install" button - click it
Or if you have SSH access, navigate to the app directory and run npm install --production
Start/Restart the App:

Use the restart button in the Node.js manager
Your app should now be running at the specified URL
Important Notes
The standalone build includes all necessary files and dependencies
Make sure your cPanel hosting supports Node.js applications
If you encounter any issues, check the Node.js logs in cPanel
The app will run on the port specified in cPanel (usually 3000 or similar, but cPanel handles the proxying)
Your Next.js app with API routes should now be live on cPanel! Let me know if you run into any issues during deployment.

Grok Code Fast 1 • 1x