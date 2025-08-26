# Mini-Blog
A simple, lightweight website for sharing short posts. It lets people sign in, jot down thoughts, and see what others have shared. The interface is clean and straightforward, so you can focus on writing. Everything loads fast and stays out of your way.
Mini Blog (Firebase)

Features
- Email/password auth 
- Create, edit, and delete posts 
- Clean, minimal UI

Quick start
1) Firebase Console
   - Enable Authentication → Email/Password
   - Create Firestore database (production or test mode)
   - Authentication → Settings → Authorized domains: add `localhost`, and your Netlify domain
2) Config
   - Open `mini-blog/firebase-config.js`
   - Paste your Firebase Web App config values
   - Note: `storageBucket` typically ends with `.appspot.com`. `measurementId` is only needed if you enable Analytics
3) Run
   - Open `index.html` in a modern browser or deploy the folder to Netlify
