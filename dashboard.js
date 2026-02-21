import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const testsContainer = document.getElementById('testsContainer');
const statsGrid = document.getElementById('statsGrid');
const sharedTestsContainer = document.getElementById('sharedTestsContainer');
let currentUser = null;

// ==========================================
// 1. AUTH VA TASHRIF HISOBI (VISIT COUNTER)
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Tashrifni hisoblash (Faqat bir marta dashboardga kirganda)
        if (!sessionStorage.getItem('visited_today')) {
            await updateDoc(doc(db, "users", user.uid), {
                visitCount: increment(1)
            });
            sessionStorage.setItem('visited_today', 'true');
        }

        loadDashboardData();
    } else {
        window.location.replace("index.html");
    }
});

// ==========================================
// 2. MA'LUMOTLARNI YUKLASH VA KESHDA SAQLASH
// ==========================================
async function loadDashboardData() {
    const CACHE_KEY = `full_dashboard_cache_${currentUser.uid}`;
    
    // a) Keshdan yuklash
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) renderDashboard(JSON.parse(cached));

    // b) Orqa fonda Firebase'dan yangilash
    try {
        // 1. Foydalanuvchi profili (Stats uchun)
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const userData = userDoc.data();

        // 2. Hamma ommaviy testlar
        const testsQuery = query(collection(db, "tests"), where("visibility", "==", "public"));
        const testsSnap = await getDocs(testsQuery);
        const allTests = testsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 3. Foydalanuvchi yechgan testlari (Shaxsiy hisob uchun)
        const resultsQuery = query(collection(db, "results"), where("userId", "==", currentUser.uid));
        const resultsSnap = await getDocs(resultsQuery);
        const myResults = resultsSnap.docs.map(d => d.data());

        // 4. Shaxsiy ulashilgan testlar (Agar foydalanuvchida sharedTests massivi bo'lsa)
        let sharedTests = [];
        if (userData.sharedTests && userData.sharedTests.length > 0) {
            // Shaxsiy testlarni ID bo'yicha tortib olish
            for (let tId of userData.sharedTests) {
                const tDoc = await getDoc(doc(db, "tests", tId));
                if (tDoc.exists()) sharedTests.push({ id: tDoc.id, ...tDoc.data() });
            }
        }

        const dashboardData = {
            user: userData,
            tests: allTests,
            myResults: myResults,
            sharedTests: sharedTests
        };

        // Keshni yangilash
        localStorage.setItem(CACHE_KEY, JSON.stringify(dashboardData));
        renderDashboard(dashboardData);

    } catch (error) { console.error("Dashboard sync error:", error); }
}

// ==========================================
// 3. EKRANGA CHIZISH (RENDER)
// ==========================================
function renderDashboard(data) {
    // A) STATISTIKA
    const totalSolved = data.myResults.length;
    const avgScore = totalSolved > 0 
        ? Math.round(data.myResults.reduce((acc, curr) => acc + curr.percentage, 0) / totalSolved) 
        : 0;

    statsGrid.innerHTML = `
        <div class="stat-card"><h3>${data.user.visitCount || 0}</h3><p>Tashriflar</p></div>
        <div class="stat-card"><h3>${totalSolved}</h3><p>Yechilgan</p></div>
        <div class="stat-card"><h3>${avgScore}%</h3><p>Umumiy foiz</p></div>
    `;

    // B) FANLAR BO'YICHA GURUHLASH
    const subjectGroups = {};
    data.tests.forEach(test => {
        const sub = test.subject || "Boshqa fanlar";
        if (!subjectGroups[sub]) subjectGroups[sub] = [];
        subjectGroups[sub].push(test);
    });

    testsContainer.innerHTML = '<h2><i class="fas fa-book-open"></i> Ommaviy Testlar</h2>';
    for (const [subject, tests] of Object.entries(subjectGroups)) {
        const subHeader = document.createElement('div');
        subHeader.className = 'date-header';
        subHeader.innerHTML = `
            <span>${subject}</span>
            <span style="font-size:0.8rem;">${tests.length} ta test <i class="fas fa-chevron-down"></i></span>
        `;
        
        const subItems = document.createElement('div');
        subItems.className = 'date-items';

        tests.forEach(test => {
            const myCount = data.myResults.filter(r => r.testId === test.id).length;
            const globalCount = test.solvedCount || 0;

            const card = document.createElement('div');
            card.className = 'glass-card test-item';
            card.innerHTML = `
                <div style="flex:1" onclick="startTest('${test.id}')">
                    <h3 style="margin:0">${test.title}</h3>
                    <p style="font-size:0.75rem; opacity:0.7;">Siz: ${myCount} marta | Jami: ${globalCount} marta</p>
                </div>
                <button onclick="showLeaderboard('${test.id}', '${test.title}')" class="btn-icon" title="Leaderboard">
                    <i class="fas fa-trophy"></i>
                </button>
            `;
            subItems.appendChild(card);
        });

        subHeader.onclick = () => subItems.classList.toggle('active');
        testsContainer.appendChild(subHeader);
        testsContainer.appendChild(subItems);
    }

    // V) SHAXSIY ULASHILGAN TESTLAR
    renderSharedTests(data.sharedTests);
}

// ==========================================
// 4. SHAXSIY TESTNI KOD/LINK ORQALI QO'SHISH
// ==========================================
window.addPrivateTest = async () => {
    const code = prompt("Shaxsiy test kodini (ID) kiriting:");
    if (!code) return;

    try {
        const testDoc = await getDoc(doc(db, "tests", code));
        if (testDoc.exists()) {
            await updateDoc(doc(db, "users", currentUser.uid), {
                sharedTests: arrayUnion(code)
            });
            alert("Test muvaffaqiyatli qo'shildi!");
            loadDashboardData();
        } else {
            alert("Bunday kodli test topilmadi!");
        }
    } catch (e) { alert("Xatolik!"); }
};

// Leaderboard ko'rsatish (Sizga modal kerak bo'ladi)
window.showLeaderboard = async (testId, title) => {
    const resultsQuery = query(
        collection(db, "results"), 
        where("testId", "==", testId),
        orderBy("percentage", "desc"),
        limit(10)
    );
    // Bu yerda modal ochib natijalarni chiqarasiz
    alert(`${title} bo'yicha Liderlar ro'yxati (Tez orada...)`);
};
                                           
