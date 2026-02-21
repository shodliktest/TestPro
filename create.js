import { auth, db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const titleInput = document.getElementById('testTitle');
const descInput = document.getElementById('testDesc');
const statusMsg = document.getElementById('statusMsg');

let currentUser = null;

// Foydalanuvchi tizimga kirganini tekshirish
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        alert("Avval tizimga kiring!");
        window.location.href = "index.html";
    }
});

uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    const title = titleInput.value.trim();
    const visibility = document.querySelector('input[name="visibility"]:checked').value;

    if (!title || !file) {
        return alert("Iltimos, test nomi va TXT faylni kiriting!");
    }

    statusMsg.style.display = 'block';
    statusMsg.innerText = "Fayl o'qilmoqda... ⏳";

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        
        // 1. Matnni Parsing qilish (JSON formatga o'tkazish)
        const questions = parseTXT(text);

        if (questions.length === 0) {
            statusMsg.innerText = "Fayldan savollar topilmadi. Formatni tekshiring!";
            statusMsg.style.color = "red";
            return;
        }

        // 2. Firebase-ga yuborish
        try {
            statusMsg.innerText = "Bazaga yuklanmoqda... 🚀";
            await addDoc(collection(db, "tests"), {
                authorId: currentUser.uid,
                title: title,
                description: descInput.value,
                visibility: visibility,
                questions: questions,
                createdAt: new Date()
            });

            statusMsg.innerText = `Muvaffaqiyatli! ${questions.length} ta savol yuklandi ✅`;
            statusMsg.style.color = "#00f2fe";
            
            // Maydonlarni tozalash
            titleInput.value = '';
            descInput.value = '';
            fileInput.value = '';
            
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
        } catch (error) {
            console.error(error);
            statusMsg.innerText = "Xatolik yuz berdi!";
            statusMsg.style.color = "red";
        }
    };
    reader.readAsText(file);
});

// 🧠 Asosiy Parsing Logikasi
function parseTXT(data) {
    const lines = data.split('\n').map(l => l.trim()).filter(l => l !== "");
    let questionsArray = [];
    let currentQ = null;

    for (let line of lines) {
        // Savolni aniqlash (Masalan: "1. " yoki "1) " bilan boshlansa)
        if (/^\d+[\.\)]/.test(line)) {
            if (currentQ) questionsArray.push(currentQ);
            
            currentQ = {
                question: line.replace(/^\d+[\.\)]\s*/, ''), // Raqamni olib tashlab, savolning o'zini qoldiradi
                options: [],
                correctIndex: 0 // Dastlabki holatda 0, pastda o'zgaradi agar * topsa
            };
        } 
        // Variantlarni aniqlash (Masalan: "A) ", "B. ")
        else if (/^[a-zA-Z][\.\)]/.test(line) && currentQ) {
            let isCorrect = line.includes('*');
            let optionText = line.replace(/^[a-zA-Z][\.\)]\s*/, '').replace('*', '').trim();
            
            if (isCorrect) {
                currentQ.correctIndex = currentQ.options.length; // Arraydagi joriy indeksni to'g'ri deb belgilaydi
            }
            currentQ.options.push(optionText);
        }
    }
    // Oxirgi savolni arrayga qo'shib qo'yish
    if (currentQ) questionsArray.push(currentQ);
    
    return questionsArray;
}

// ==========================================
// TUN REJIMI (DARK MODE) SAQLASH VA ISHLATISH
// ==========================================
const themeToggle = document.getElementById('themeToggle');

// 1. Sahifa yuklanishi bilan LocalStorage'ni tekshirish
if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
} else {
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}

// 2. Tugma bosilganda rejimi o'zgartirish va xotiraga yozish
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        
        if (isDark) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light'); // Yorug' rejimni eslab qolish
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark'); // Tun rejimini eslab qolish
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });
}
