import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const regBtn = document.getElementById('regBtn');

// 1. RO'YXATDAN O'TISH
regBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if(!email || !password) return alert("Ma'lumotlarni to'liq kiriting!");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Foydalanuvchi ma'lumotlarini Firestore bazasiga saqlash
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            role: "user", // Default rol
            createdAt: new Date()
        });

        alert("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
        window.location.href = "dashboard.html"; 
    } catch (error) {
        alert("Xato: " + error.message);
    }
});

// 2. TIZIMGA KIRISH
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "dashboard.html";
    } catch (error) {
        alert("Xatolik: Parol yoki email noto'g'ri!");
    }
});
