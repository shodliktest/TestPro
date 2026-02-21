import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const welcomeText = document.getElementById('welcomeText');
const userEmailDisplay = document.getElementById('userEmail');
const adminLink = document.getElementById('adminLink');
const testsContainer = document.getElementById('testsContainer');

// Foydalanuvchini tekshirish va ma'lumotlarini yuklash
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userEmailDisplay.innerText = user.email;
        
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                welcomeText.innerText = `Xush kelibsiz, ${userData.email.split('@')[0]}!`;
                
                if (userData.role === 'admin') {
                    adminLink.style.display = 'block';
                }
            } else {
                welcomeText.innerText = `Xush kelibsiz!`;
            }
        } catch (error) {
            console.error("Foydalanuvchi ma'lumotlarini olishda xato:", error);
            welcomeText.innerText = `Xush kelibsiz!`;
        }
        
        // Asosiy ma'lumotlarni yuklash
        loadTests();
        loadUserStats(user.uid); // Foydalanuvchi statistikasini yuklaymiz

    } else {
        // Tizimga kirmagan bo'lsa, login sahifasiga qaytarish
        window.location.href = "index.html";
    }
});

// FOYDALANUVCHI STATISTIKASINI YUKLASH (YANGI QISM)
async function loadUserStats(uid) {
    try {
        const q = query(collection(db, "results"), where("userId", "==", uid));
        const querySnapshot = await getDocs(q);
        
        let attempts = querySnapshot.size;
        let totalPercentage = 0;
        
        querySnapshot.forEach((doc) => {
            totalPercentage += doc.data().percentage;
        });
        
        let avgScore = attempts > 0 ? Math.round(totalPercentage / attempts) : 0;
        
        document.getElementById('attemptsStat').innerText = attempts;
        document.getElementById('avgScoreStat').innerText = avgScore + '%';
        
    } catch (error) {
        console.error("Statistikani yuklashda xato:", error);
    }
}

// TESTLARNI BAZADAN YUKLASH FUNKSIYASI
async function loadTests() {
    try {
        testsContainer.innerHTML = ''; // Oldin tozalab olamiz
        
        const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        // Barcha testlar sonini ekranga chiqarish (YANGI QISM)
        document.getElementById('totalTestsStat').innerText = querySnapshot.size;

        if (querySnapshot.empty) {
            testsContainer.innerHTML = '<p>Hozircha testlar yo\'q. Birinchi bo\'lib test yarating!</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const test = doc.data();
            const testId = doc.id;
            const questionsCount = test.questions ? test.questions.length : 0;
            
            // Test kartochkasini yaratish
            const testCard = document.createElement('div');
            testCard.className = 'test-card glass-card';
            testCard.style.padding = '25px';
            testCard.style.margin = '0';
            testCard.style.display = 'flex';
            testCard.style.flexDirection = 'column';
            testCard.style.justifyContent = 'space-between';
            testCard.style.minHeight = '180px';

            testCard.innerHTML = `
                <div>
                    <h3 style="color: var(--btn-primary); margin-bottom: 10px; font-size: 1.2rem;">${test.title}</h3>
                    <p style="font-size: 0.9rem; text-align: left; margin-bottom: 15px; opacity: 0.8;">${test.description || "Ta'rif kiritilmagan"}</p>
                    <div style="display: flex; gap: 15px; font-size: 0.85rem; opacity: 0.9; margin-bottom: 20px;">
                        <span><i class="fas fa-question-circle"></i> ${questionsCount} ta savol</span>
                        <span><i class="fas ${test.visibility === 'public' ? 'fa-globe' : 'fa-lock'}"></i> ${test.visibility}</span>
                    </div>
                </div>
                <button onclick="startTest('${testId}')" class="btn btn-primary" style="margin-top: auto;">Testni ishlash</button>
            `;
            
            testsContainer.appendChild(testCard);
        });

    } catch (error) {
        console.error("Testlarni yuklashda xato: ", error);
        testsContainer.innerHTML = '<p style="color: #ff6b6b;">Xatolik yuz berdi. Internetni yoki bazani tekshiring.</p>';
    }
}

// Global scope uchun startTest funksiyasini yozamiz
window.startTest = function(testId) {
    window.location.href = `test.html?id=${testId}`;
};

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
