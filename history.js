import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const historyContainer = document.getElementById('historyContainer');
let currentUser = null;

// FOYDALANUVCHINI TEKSHIRISH
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadHistory();
    } else {
        // Agar tizimga kirmagan bo'lsa, login sahifasiga qaytarish
        window.location.replace("index.html");
    }
});

// NATIJALARNI YUKLASH VA GURUHLASH FUNKSIYASI
async function loadHistory() {
    try {
        historyContainer.innerHTML = '<p style="text-align: center; opacity: 0.7;">Ma\'lumotlar yuklanmoqda... ⏳</p>';
        
        // Bazadan faqat shu userning natijalarini vaqti bo'yicha saralab olish
        const q = query(
            collection(db, "results"), 
            where("userId", "==", currentUser.uid),
            orderBy("completedAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            historyContainer.innerHTML = '<p style="text-align: center; color: #ff6b6b; padding: 20px;">Siz hali hech qanday test ishlamagansiz.</p>';
            return;
        }

        // 1. MA'LUMOTLARNI KUNLAR BO'YICHA GURUHGA AJRATISH
        const groupedResults = {};

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const resultId = doc.id;
            
            // Sanani chiroyli formatlash (Masalan: "21-Fevral, 2026")
            const dateObj = data.completedAt ? data.completedAt.toDate() : new Date();
            const dateKey = dateObj.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute:'2-digit' });

            // Agar bu kun hali ro'yxatda yo'q bo'lsa, yangi massiv ochamiz
            if (!groupedResults[dateKey]) {
                groupedResults[dateKey] = [];
            }

            // Test ma'lumotini o'sha kunning guruhiga qo'shamiz
            groupedResults[dateKey].push({ id: resultId, time: timeStr, ...data });
        });

        historyContainer.innerHTML = ''; // Yuklanmoqda yozuvini tozalash

        // 2. GURUHLANGAN MA'LUMOTLARNI EKRANGA CHIZISH (Akkordeon usulida)
        let isFirst = true; // Eng birinchi (bugungi) kunni avtomatik ochiq qoldirish uchun

        for (const [date, tests] of Object.entries(groupedResults)) {
            
            // A) Kun sarlavhasini yaratish
            const headerDiv = document.createElement('div');
            headerDiv.className = 'date-header';
            headerDiv.style.cssText = `
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid var(--glass-border);
                padding: 15px 20px;
                border-radius: 12px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                font-weight: 600;
                transition: background 0.3s;
            `;
            
            headerDiv.innerHTML = `
                <span><i class="far fa-calendar-alt" style="color: var(--btn-primary); margin-right: 8px;"></i> ${date}</span>
                <span style="font-size: 0.85rem; opacity: 0.8;">${tests.length} ta natija <i class="fas fa-chevron-down toggle-icon" style="margin-left: 10px; transition: 0.3s;"></i></span>
            `;

            // B) Shu kungi testlar turadigan konteynerni yaratish
            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'date-items';
            itemsDiv.style.cssText = `
                display: none;
                margin-bottom: 25px;
                padding-left: 15px;
                border-left: 2px solid var(--btn-primary);
                flex-direction: column;
                gap: 15px;
                animation: fadeIn 0.3s ease-in-out;
            `;
            
            // Birinchi kun har doim ochiq turishi uchun
            if (isFirst) {
                itemsDiv.style.display = 'flex';
                headerDiv.querySelector('.toggle-icon').classList.replace('fa-chevron-down', 'fa-chevron-up');
                isFirst = false;
            }

            // C) Shu kungi testlarni ichiga chizib chiqish
            tests.forEach(test => {
                const scoreColor = test.percentage >= 70 ? 'var(--btn-primary)' : '#ff4757';
                
                const card = document.createElement('div');
                card.className = 'glass-card';
                card.style.padding = '15px 20px';
                card.style.margin = '0';
                card.style.display = 'flex';
                card.style.justifyContent = 'space-between';
                card.style.alignItems = 'center';
                card.style.flexWrap = 'wrap'; 
                card.style.gap = '10px';

                card.innerHTML = `
                    <div>
                        <h3 style="margin-bottom: 5px; font-size: 1.1rem;">${test.testTitle || 'Nomsiz test'}</h3>
                        <p style="font-size: 0.85rem; opacity: 0.7; margin: 0;"><i class="far fa-clock"></i> Soat: ${test.time}</p>
                    </div>
                    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                        <div>
                            <h2 style="color: ${scoreColor}; margin-bottom: 0; line-height: 1; font-size: 1.4rem;">${test.percentage}%</h2>
                            <p style="font-size: 0.8rem; opacity: 0.9; margin: 0;">${test.score} / ${test.totalQuestions}</p>
                        </div>
                        <button onclick="window.location.href='review.html?id=${test.id}'" class="btn btn-outline" style="padding: 5px 15px; font-size: 0.8rem; margin: 0; border-color: ${scoreColor}; color: ${scoreColor}; width: auto;">
                            <i class="fas fa-eye"></i> Tahlil
                        </button>
                    </div>
                `;
                itemsDiv.appendChild(card);
            });

            // D) Bosilganda ochilib-yopilishi (Akkordeon) animatsiyasi
            headerDiv.addEventListener('click', () => {
                const isOpen = itemsDiv.style.display === 'flex';
                const icon = headerDiv.querySelector('.toggle-icon');
                
                if (isOpen) {
                    itemsDiv.style.display = 'none';
                    icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
                } else {
                    itemsDiv.style.display = 'flex';
                    icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
                }
            });

            // Hover effektini JS orqali beramiz (CSS yozib o'tirmaslik uchun)
            headerDiv.addEventListener('mouseenter', () => headerDiv.style.background = 'rgba(255, 255, 255, 0.1)');
            headerDiv.addEventListener('mouseleave', () => headerDiv.style.background = 'rgba(255, 255, 255, 0.05)');

            // E) Tayyor bloklarni ekranga qo'shish
            historyContainer.appendChild(headerDiv);
            historyContainer.appendChild(itemsDiv);
        }

    } catch (error) {
        console.error("Tarixni yuklashda xato:", error);
        historyContainer.innerHTML = '<p style="color: #ff4757; text-align: center;">Xatolik yuz berdi. Internetni tekshiring.</p>';
    }
}

// CHIQISH (LOGOUT) TUGMASI
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.replace("index.html");
    });
});
