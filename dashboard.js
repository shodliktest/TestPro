import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const welcomeText = document.getElementById('welcomeText');
const userEmailDisplay = document.getElementById('userEmail');
const adminLink = document.getElementById('adminLink');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userEmailDisplay.innerText = user.email;
        
        // Firestore'dan foydalanuvchi rolini tekshirish
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            welcomeText.innerText = `Xush kelibsiz, ${userData.email.split('@')[0]}!`;
            
            // Agar admin bo'lsa, admin panelni ko'rsatish
            if (userData.role === 'admin') {
                adminLink.style.display = 'block';
            }
        }
    } else {
        // Tizimga kirmagan bo'lsa, login sahifasiga qaytarish
        window.location.href = "index.html";
    }
});

// Chiqish funksiyasi
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
});

// Dark/Light Mode Switcher
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
});
