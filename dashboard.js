import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const welcomeText = document.getElementById('welcomeText');
const userEmailDisplay = document.getElementById('userEmail');
const adminLink = document.getElementById('adminLink');
const testsContainer = document.getElementById('testsContainer');

// Foydalanuvchini tekshirish
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userEmailDisplay.innerText = user.email;
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            welcomeText.innerText = `Xush kelibsiz, ${userData.email.split('@')[0]}!`;
            
            if (userData.role === 'admin') {
                adminLink.style.display = 'block';
            }
        }
        
        // Foydalanuvchi tasdiqlangach, testlarni yuklaymiz
        loadTests();

    } else {
        window.location.href = "index.html";
    }
});

// TESTLARNI BAZADAN YUKLASH FUNKSIYASI
async function loadTests() {
    try {
        testsContainer.innerHTML = ''; // Oldin tozalab olamiz
        
        // tests kolleksiyasidan vaqti bo'yicha saralab olish
        const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            testsContainer.innerHTML = '<p>Hozircha testlar yo\'q. Birinchi bo\'lib test yarating!</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const test = doc.data();
            const testId = doc.id; // Testning maxsus ID si
            
            // Test kartochkasini yaratish
            const testCard = document.createElement('div');
            testCard.className = 'test-card glass-card';
            testCard.style.padding = '20px';
            testCard.style.margin = '0';
            testCard.style.display = 'flex';
            testCard.style.flexDirection = 'column';
            testCard.style.justifyContent = 'space-between';

            testCard.innerHTML = `
                <div>
                    <h3 style="color: var(--btn-primary); margin-bottom: 10px;">${test.title}</h3>
                    <p style="font-size: 0.9rem; text-align: left; margin-bottom: 15px;">${test.description || "Ta'rif kiritilmagan"}</p>
                    <div style="display: flex; gap: 10px; font-size: 0.8rem; opacity: 0.8; margin-bottom: 20px;">
                        <span><i class="fas fa-question-circle"></i> ${test.questions.length} ta savol</span>
                        <span><i class="fas ${test.visibility === 'public' ? 'fa-globe' : 'fa-lock'}"></i> ${test.visibility}</span>
                    </div>
                </div>
                <button onclick="startTest('${testId}')" class="btn btn-primary" style="margin-top: auto;">Testni ishlash</button>
            `;
            
            testsContainer.appendChild(testCard);
        });

    } catch (error) {
        console.error("Testlarni yuklashda xato: ", error);
        testsContainer.innerHTML = '<p style="color: red;">Xatolik yuz berdi. Internetni tekshiring.</p>';
    }
}

// Global scope uchun startTest funksiyasini yozamiz
window.startTest = function(testId) {
    // Bosilganda test ishlash sahifasiga ID bilan o'tkazamiz
    window.location.href = `test.html?id=${testId}`;
};

// Chiqish
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
});

// Dark Mode
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
});
                             
