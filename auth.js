import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged // <-- SHU QO'SHILDI
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const regBtn = document.getElementById('regBtn');

// ==========================================
// SEHR SHU YERDA: Foydalanuvchini eslab qolish
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Agar foydalanuvchi tizimda bor bo'lsa, kuttirmasdan Dashboardga o'tkazamiz
        window.location.href = "dashboard.html";
    }
});
// ==========================================

// 1. RO'YXATDAN O'TISH
regBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if(!email || !password) return alert("Ma'lumotlarni to'liq kiriting!");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Foydalanuvchini Firestore'ga saqlash
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            role: "user",
            createdAt: new Date()
        });

        // onAuthStateChanged o'zi dashboard.html ga o'tkazib yuboradi, bu yerda alert yetarli
    } catch (error) {
        alert("Xato: " + error.message);
    }
});

// 2. TIZIMGA KIRISH (LOGIN)
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged ishga tushib, dashboard.html ga o'tkazadi
    } catch (error) {
        alert("Xatolik: Parol yoki email noto'g'ri!");
    }
});
