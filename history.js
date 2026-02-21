import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const historyContainer = document.getElementById('historyContainer');
let currentUser = null;

// Foydalanuvchini tekshirish
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadHistory();
    } else {
        window.location.href = "index.html";
    }
});

// Natijalarni yuklash funksiyasi
async function loadHistory() {
    try {
        historyContainer.innerHTML = ''; // Ekranni tozalash
        
        // Faqat shu userga tegishli natijalarni vaqti bo'yicha saralab olish
        const q = query(
            collection(db, "results"), 
            where("userId", "==", currentUser.uid),
            orderBy("completedAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            historyContainer.innerHTML = '<p style="color: #ff6b6b;">Siz hali hech qanday test ishlamagansiz.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const resultId = doc.id; // Natijaning maxsus ID si (tahlil uchun kerak)
            
            // Sanani chiroyli formatga o'tkazish
            const dateObj = data.completedAt ? data.completedAt.toDate() : new Date();
            const dateStr = dateObj.toLocaleString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
            
            // Foizga qarab rang berish
            const scoreColor = data.percentage >= 70 ? 'var(--btn-primary)' : '#ff4757';

            // Har bir natija uchun kartochka yaratish
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.style.padding = '20px';
            card.style.margin = '0';
            card.style.maxWidth = '100%';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';
            card.style.flexWrap = 'wrap'; 
            card.style.gap = '15px';

            card.innerHTML = `
                <div>
                    <h3 style="margin-bottom: 5px; font-size: 1.2rem;">${data.testTitle || 'Nomsiz test'}</h3>
                    <p style="font-size: 0.85rem; opacity: 0.7; margin: 0;"><i class="far fa-clock"></i> ${dateStr}</p>
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                    <div>
                        <h2 style="color: ${scoreColor}; margin-bottom: 0; line-height: 1;">${data.percentage}%</h2>
                        <p style="font-size: 0.85rem; opacity: 0.9; margin: 0;">${data.score} / ${data.totalQuestions}</p>
                    </div>
                    <button onclick="window.location.href='review.html?id=${resultId}'" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem; width: auto; margin: 0; border-color: ${scoreColor}; color: ${scoreColor};">👁 Tahlil qilish</button>
                </div>
            `;
            
            historyContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Tarixni yuklashda xato:", error);
        historyContainer.innerHTML = '<p style="color: #ff4757;">Xatolik yuz berdi. Internetni tekshiring yoki bazada index yaratilmagan bo\'lishi mumkin.</p>';
    }
}

// Chiqish tugmasi
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
});

// Dark/Light Mode
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
});
