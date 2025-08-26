# Mini-Blog
A simple, lightweight website for sharing short posts. It lets people sign in, jot down thoughts, and see what others have shared. The interface is clean and straightforward, so you can focus on writing. Everything loads fast and stays out of your way.
Mini Blog (Firebase)

Overview
- Email/password authentication via Firebase Auth
- Create, edit, delete posts stored in Firestore
- Title, content, timestamps per post

Setup
1) Create a Firebase project in the console
2) Enable Authentication (Email/Password)
3) Create a Firestore database (Start in production or test mode)
4) Copy `firebase-config.example.js` to `firebase-config.js` and fill your keys
5) Open `index.html` in a modern browser or host on Netlify

Optional security rules (Firestore)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.author == request.auth.token.email;
      allow update, delete: if request.auth != null && resource.data.author == request.auth.token.email;
    }
  }
}
```

Files
- `index.html` – UI + Firebase SDK via CDN
- `styles.css` – styling
- `app.js` – app logic (Auth + Firestore CRUD)
- `firebase-config.example.js` – copy to `firebase-config.js` with your keys


