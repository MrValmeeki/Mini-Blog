// Mini Blog SPA - Firebase Auth + Firestore

;(function () {
    'use strict'

    // DOM helpers
    const $ = (sel) => document.querySelector(sel)
    const $$ = (sel) => Array.from(document.querySelectorAll(sel))

    const authPanels = $('#authPanels')
    const appPanel = $('#appPanel')
    const authBar = $('#authBar')
    const welcomeText = $('#welcomeText')
    const logoutBtn = $('#logoutBtn')
    const registerForm = $('#registerForm')
    const loginForm = $('#loginForm')
    const regUsername = $('#regUsername')
    const regEmail = $('#regEmail')
    const regPassword = $('#regPassword')
    const loginEmail = $('#loginEmail')
    const loginPassword = $('#loginPassword')
    const postForm = $('#postForm')
    const postTitle = $('#postTitle')
    const postContent = $('#postContent')
    const postsList = $('#postsList')
    const searchInput = $('#searchInput')
    const cancelEditBtn = $('#cancelEditBtn')
    const editingPostId = $('#editingPostId')
    const postItemTpl = $('#postItemTpl')

    // Simple utilities
    function asDate(value) {
        if (!value) return null
        if (value instanceof Date) return value
        if (typeof value === 'number') return new Date(value)
        if (typeof value === 'string') {
            const d = new Date(value)
            return isNaN(d) ? null : d
        }
        // Firestore Timestamp
        if (typeof value === 'object') {
            if (typeof value.toDate === 'function') return value.toDate()
            if ('seconds' in value && typeof value.seconds === 'number') {
                return new Date(value.seconds * 1000)
            }
        }
        return null
    }

    function formatDateTime(value) {
        const d = asDate(value)
        return d ? d.toLocaleString() : 'Unknown'
    }

    function sanitize(text) {
        const div = document.createElement('div')
        div.textContent = String(text)
        return div.innerHTML
    }

    // Firebase handles auth; we mirror minimal UI state locally
    const Session = {
        getUser() {
            const u = localStorage.getItem('mini_blog_user')
            return u ? JSON.parse(u) : null
        },
        setUser(user) {
            localStorage.setItem('mini_blog_user', JSON.stringify({ uid: user.uid, email: user.email }))
        },
        clear() { localStorage.removeItem('mini_blog_user') }
    }

    // UI state
    function setLoggedIn(username) {
        if (username) {
            welcomeText.textContent = `Hi, ${username}`
            authBar.classList.remove('hidden')
            authPanels.classList.add('hidden')
            appPanel.classList.remove('hidden')
        } else {
            authBar.classList.add('hidden')
            authPanels.classList.remove('hidden')
            appPanel.classList.add('hidden')
        }
    }

    function clearPostForm() {
        postTitle.value = ''
        postContent.value = ''
        editingPostId.value = ''
        cancelEditBtn.classList.add('hidden')
        postForm.querySelector('button[type="submit"]').textContent = 'Publish'
    }

    function renderPosts(items, currentUser, query = '') {
        postsList.innerHTML = ''
        const q = query.trim().toLowerCase()
        const filtered = items.filter(p => {
            if (!q) return true
            return (
                String(p.title).toLowerCase().includes(q) ||
                String(p.content).toLowerCase().includes(q)
            )
        })
        if (filtered.length === 0) {
            postsList.innerHTML = '<div class="notice">No posts yet.</div>'
            return
        }
        for (const p of filtered) {
            const node = document.importNode(postItemTpl.content, true)
            node.querySelector('.post-title').innerHTML = sanitize(p.title)
            node.querySelector('.post-content').innerHTML = sanitize(p.content)
            const meta = `by ${sanitize(p.author)} • ${formatDateTime(p.createdAt)}${p.updatedAt && p.updatedAt !== p.createdAt ? ' • edited ' + formatDateTime(p.updatedAt) : ''}`
            node.querySelector('.post-meta').textContent = meta
            const actions = node.querySelector('.post-actions')
            if (currentUser && currentUser.email === p.author) {
                const editBtn = document.createElement('button')
                editBtn.className = 'btn btn-secondary'
                editBtn.textContent = 'Edit'
                editBtn.addEventListener('click', () => {
                    editingPostId.value = p.id
                    postTitle.value = p.title
                    postContent.value = p.content
                    postForm.querySelector('button[type="submit"]').textContent = 'Save Changes'
                    cancelEditBtn.classList.remove('hidden')
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                })
                const delBtn = document.createElement('button')
                delBtn.className = 'btn btn-danger'
                delBtn.textContent = 'Delete'
                delBtn.addEventListener('click', async () => {
                    if (!confirm('Delete this post?')) return
                    await Posts.remove(p.id)
                    await reloadPosts()
                })
                actions.append(editBtn, delBtn)
            }
            postsList.appendChild(node)
        }
    }

    async function reloadPosts() {
        const { db } = window.firebaseServices
        const { collection, getDocs, query, orderBy } = window.firebaseDbFns
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
        const snap = await getDocs(q)
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        renderPosts(items, Session.getUser(), searchInput.value)
    }

    // Event listeners
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const email = regEmail.value.trim()
        const password = regPassword.value
        if (!email) { alert('Email is required'); return }
        if (password.length < 6) { alert('Password must be at least 6 chars'); return }
        try {
            const { auth, db } = window.firebaseServices
            const { createUserWithEmailAndPassword } = window.firebaseAuthFns
            const { collection, addDoc } = window.firebaseDbFns
            const displayName = regUsername.value.trim()
            const cred = await createUserWithEmailAndPassword(auth, email, password)

            // Save profile to Firestore (users collection)
            await addDoc(collection(db, 'users'), {
                uid: cred.user.uid,
                email: cred.user.email,
                username: displayName,
                createdAt: new Date().toISOString()
            })

            // Update UI/session
            Session.setUser({ uid: cred.user.uid, email: cred.user.email })
            setLoggedIn(displayName || cred.user.email)
            await reloadPosts()
            registerForm.reset(); loginForm.reset()
        } catch (err) {
            alert(err.message)
        }
    })

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const email = loginEmail.value.trim()
        const password = loginPassword.value
        try {
            const { auth } = window.firebaseServices
            const { signInWithEmailAndPassword } = window.firebaseAuthFns
            const cred = await signInWithEmailAndPassword(auth, email, password)
            Session.setUser(cred.user)
            // Try to show username if available from Firestore
            try {
                const { db } = window.firebaseServices
                const { getDocs, collection } = window.firebaseDbFns
                const snap = await getDocs(collection(db, 'users'))
                const profile = snap.docs.map(d => d.data()).find(p => p.uid === cred.user.uid)
                setLoggedIn((profile && profile.username) || cred.user.email)
            } catch {
                setLoggedIn(cred.user.email)
            }
            await reloadPosts()
            loginForm.reset()
        } catch (err) {
            alert(err.message)
        }
    })

    logoutBtn.addEventListener('click', async () => {
        try {
            const { auth } = window.firebaseServices
            const { signOut } = window.firebaseAuthFns
            await signOut(auth)
            Session.clear(); setLoggedIn(null); clearPostForm()
        } catch (err) { alert(err.message) }
    })

    postForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const current = Session.getUser()
        if (!current) { alert('Please login'); return }
        const title = postTitle.value.trim()
        const content = postContent.value.trim()
        if (!title || !content) { alert('Title and content are required'); return }
        const id = editingPostId.value
        const { db } = window.firebaseServices
        const { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs } = window.firebaseDbFns
        // Look up username for author label
        let authorLabel = current.email
        try {
            const snap = await getDocs(collection(db, 'users'))
            const profile = snap.docs.map(d => d.data()).find(p => p.uid === current.uid)
            if (profile && profile.username) authorLabel = profile.username
        } catch {}
        if (id) {
            const ref = doc(db, 'posts', id)
            await updateDoc(ref, { title, content, updatedAt: serverTimestamp() })
        } else {
            await addDoc(collection(db, 'posts'), {
                title,
                content,
                author: authorLabel,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            })
        }
        clearPostForm()
        await reloadPosts()
    })

    cancelEditBtn.addEventListener('click', () => {
        clearPostForm()
    })

    searchInput.addEventListener('input', async () => {
        await reloadPosts()
    })

    // Init: observe auth state
    ;(function init() {
        const { auth, db } = window.firebaseServices
        const { onAuthStateChanged } = window.firebaseAuthFns
        const { getDocs, collection } = window.firebaseDbFns
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                Session.setUser(user)
                let name = user.email
                try {
                    const snap = await getDocs(collection(db, 'users'))
                    const profile = snap.docs.map(d => d.data()).find(p => p.uid === user.uid)
                    if (profile && profile.username) name = profile.username
                } catch {}
                setLoggedIn(name)
                await reloadPosts()
            } else {
                Session.clear()
                setLoggedIn(null)
                postsList.innerHTML = '<div class="notice">Please login to view posts.</div>'
            }
        })
    })()
})()


